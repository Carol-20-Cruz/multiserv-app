"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  mensajeDeError,
  MENSAJE_SIN_CONEXION,
  pedirApi,
} from "@/lib/api-navegador";
import { campoFechaHoraAIso, isoACampoFechaHora } from "@/lib/fechas";
import type { ClienteDetalle, Equipo } from "@/lib/tipos-clientes";
import {
  ETIQUETA_MODALIDAD,
  type Modalidad,
  type OrdenDetalle,
  type Responsable,
} from "@/lib/tipos-ordenes";
import { NOMBRE_ROL } from "@/lib/tipos-sesion";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ordenSchema, type OrdenFormData } from "./schema";
import SelectorCliente from "./selector-cliente";

interface OrdenFormProps {
  responsables: Responsable[];
  // Orden nueva: quien la crea es el responsable por defecto.
  usuarioId?: number;
  // Orden nueva desde el detalle del cliente (?clienteId=&equipoId=).
  clienteInicial?: ClienteDetalle | null;
  equipoInicialId?: number;
  // Con orden: editar los datos de la recepción.
  orden?: OrdenDetalle;
}

const Obligatorio = () => (
  <span aria-hidden="true" className="text-red-500">
    {" "}
    *
  </span>
);

const nombreEquipo = (
  equipo: Pick<Equipo, "marca" | "referencia" | "serial"> & {
    tipoEquipo: { nombre: string };
  },
) =>
  [equipo.tipoEquipo.nombre, equipo.marca, equipo.referencia]
    .filter(Boolean)
    .join(" ");

// SWR-ORD-001: registrar una orden de servicio (cliente -> equipo -> datos
// de la recepción) o editar los datos de una orden existente.
export default function OrdenForm({
  responsables,
  usuarioId,
  clienteInicial = null,
  equipoInicialId,
  orden,
}: OrdenFormProps) {
  const router = useRouter();
  const editando = Boolean(orden);
  const [cliente, setCliente] = useState<ClienteDetalle | null>(clienteInicial);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const equipoValido =
    equipoInicialId !== undefined &&
    clienteInicial?.equipos.some((e) => e.id === equipoInicialId);

  const {
    register,
    control,
    handleSubmit,
    setValue,

    formState: { errors, isSubmitting },
  } = useForm<OrdenFormData>({
    resolver: zodResolver(ordenSchema(editando)),
    mode: "onTouched",
    defaultValues: {
      clienteId: clienteInicial ? String(clienteInicial.id) : "",
      equipoId: equipoValido ? String(equipoInicialId) : "",
      responsableId: String(orden?.responsable.id ?? usuarioId ?? ""),
      modalidad: orden?.modalidad ?? "TALLER",
      direccionVisita: orden?.direccionVisita ?? "",
      fechaVisita: isoACampoFechaHora(orden?.fechaVisita ?? null),
      fallaReportada: orden?.fallaReportada ?? "",
      accesorios: orden?.accesorios ?? "",
      estadoEquipo: orden?.estadoEquipo ?? "",
    },
  });
  const enDomicilio = useWatch({ control, name: "modalidad" }) === "DOMICILIO";

  const nombreResponsable = Object.fromEntries(
    responsables.map((r) => [
      String(r.id),
      `${r.nombre} (${NOMBRE_ROL[r.rol]})`,
    ]),
  );
  const equipos = cliente?.equipos ?? [];
  const nombrePorEquipo = Object.fromEntries(
    equipos.map((e) => [String(e.id), nombreEquipo(e)]),
  );

  const seleccionarCliente = (nuevo: ClienteDetalle | null) => {
    setCliente(nuevo);
    setValue("clienteId", nuevo ? String(nuevo.id) : "", {
      shouldValidate: Boolean(nuevo),
    });
    // Un solo equipo: se elige solo. Si no, la persona escoge.
    setValue(
      "equipoId",
      nuevo?.equipos.length === 1 ? String(nuevo.equipos[0].id) : "",
    );
  };

  const enviar = async (datos: OrdenFormData) => {
    setErrorServidor(null);
    setExito(null);

    const domicilio = datos.modalidad === "DOMICILIO";
    const recepcion = {
      // Vacío: el backend pone a quien crea la orden.
      responsableId: datos.responsableId
        ? Number(datos.responsableId)
        : undefined,
      modalidad: datos.modalidad,
      direccionVisita: domicilio ? datos.direccionVisita : null,
      fechaVisita: domicilio ? campoFechaHoraAIso(datos.fechaVisita) : null,
      fallaReportada: datos.fallaReportada,
      accesorios: datos.accesorios,
      estadoEquipo: datos.estadoEquipo,
    };

    try {
      const res = editando
        ? await pedirApi<{ id: number }>(
            `/api/ordenes/${orden!.id}`,
            "PATCH",
            recepcion,
          )
        : await pedirApi<{ id: number }>("/api/ordenes", "POST", {
            clienteId: Number(datos.clienteId),
            equipoId: Number(datos.equipoId),
            ...recepcion,
          });

      if (!res.ok) {
        setErrorServidor(
          mensajeDeError(res.cuerpo, "No se pudo guardar la orden"),
        );
        return;
      }

      setExito(
        editando
          ? "Orden actualizada correctamente."
          : "Orden creada correctamente.",
      );
      router.push(
        `/ordenes/${res.cuerpo.id}?${editando ? "actualizada" : "creada"}=1`,
      );
      router.refresh();
    } catch {
      setErrorServidor(MENSAJE_SIN_CONEXION);
    }
  };

  const texto = (
    nombre: "direccionVisita" | "accesorios" | "estadoEquipo",
    etiqueta: string,
    props: React.ComponentProps<typeof Input> & { obligatorio?: boolean } = {},
  ) => {
    const { obligatorio, ...inputProps } = props;
    const error = errors[nombre];
    return (
      <Field data-invalid={Boolean(error)} controlId={nombre}>
        <FieldLabel className="mb-1.5 block">
          {etiqueta}
          {obligatorio && <Obligatorio />}
        </FieldLabel>
        <Input
          {...inputProps}
          {...register(nombre)}
          aria-invalid={error ? "true" : undefined}
          aria-required={obligatorio || undefined}
        />
        <FieldError errors={[error]} />
      </Field>
    );
  };

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-6">
      {errorServidor && (
        <Alert variant="destructive">
          <AlertDescription className="text-red-700 dark:text-red-300">
            {errorServidor}
          </AlertDescription>
        </Alert>
      )}
      {exito && (
        <Alert variant="success" role="status">
          <AlertDescription className="text-green-700 dark:text-green-300">
            {exito}
          </AlertDescription>
        </Alert>
      )}

      {editando ? (
        // Al editar, el cliente y el equipo no cambian (trazabilidad).
        <dl className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <dt className="mb-1 text-xs text-gray-500 dark:text-gray-400">
              Cliente
            </dt>
            <dd className="text-sm font-medium text-gray-800 dark:text-white/90">
              {orden!.cliente.nombre}
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-xs text-gray-500 dark:text-gray-400">
              Equipo
            </dt>
            <dd className="text-sm font-medium text-gray-800 dark:text-white/90">
              {nombreEquipo(orden!.equipo)}
            </dd>
          </div>
        </dl>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field data-invalid={Boolean(errors.clienteId)} controlId="clienteId">
            <FieldLabel className="mb-1.5 block">
              Cliente
              <Obligatorio />
            </FieldLabel>
            <SelectorCliente
              id="clienteId"
              cliente={cliente}
              onSeleccionar={seleccionarCliente}
              invalido={Boolean(errors.clienteId)}
            />
            <FieldError errors={[errors.clienteId]} />
          </Field>

          <Field data-invalid={Boolean(errors.equipoId)} controlId="equipoId">
            <FieldLabel className="mb-1.5 block">
              Equipo
              <Obligatorio />
            </FieldLabel>
            {cliente && equipos.length === 0 ? (
              <Alert variant="warning">
                <AlertDescription className="text-amber-700 dark:text-amber-200">
                  Este cliente no tiene equipos.{" "}
                  <Link
                    href={`/clientes/${cliente.id}`}
                    className="font-medium underline"
                  >
                    Agrégale uno en su ficha
                  </Link>{" "}
                  y vuelve a crear la orden.
                </AlertDescription>
              </Alert>
            ) : (
              <Controller
                control={control}
                name="equipoId"
                render={({ field }) => (
                  <Select
                    value={field.value || null}
                    onValueChange={(valor) => field.onChange(valor ?? "")}
                    disabled={!cliente}
                  >
                    <SelectTrigger
                      id="equipoId"
                      ref={field.ref}
                      onBlur={field.onBlur}
                      aria-invalid={errors.equipoId ? "true" : undefined}
                      aria-required="true"
                    >
                      <SelectValue>
                        {(valor: string | null) =>
                          valor
                            ? nombrePorEquipo[valor]
                            : cliente
                              ? "Selecciona el equipo"
                              : "Primero elige el cliente"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {equipos.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {nombreEquipo(e)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
            <FieldError errors={[errors.equipoId]} />
          </Field>
        </div>
      )}

      <Field
        data-invalid={Boolean(errors.fallaReportada)}
        controlId="fallaReportada"
      >
        <FieldLabel className="mb-1.5 block">
          Falla reportada
          <Obligatorio />
        </FieldLabel>
        <Textarea
          {...register("fallaReportada")}
          rows={3}
          placeholder="Lo que cuenta el cliente. Ej.: no enfría, hace ruido al centrifugar"
          aria-invalid={errors.fallaReportada ? "true" : undefined}
          aria-required="true"
        />
        <FieldError errors={[errors.fallaReportada]} />
      </Field>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {texto("accesorios", "Accesorios que deja", {
          placeholder: "Opcional (ej.: control remoto, manguera)",
        })}
        {texto("estadoEquipo", "Estado en que llega el equipo", {
          placeholder: "Opcional (ej.: rayón en la puerta)",
        })}

        <Field controlId="responsableId">
          <FieldLabel className="mb-1.5 block">Responsable</FieldLabel>
          <Controller
            control={control}
            name="responsableId"
            render={({ field }) => (
              <Select
                value={field.value || null}
                onValueChange={(valor) => field.onChange(valor ?? "")}
              >
                <SelectTrigger
                  id="responsableId"
                  ref={field.ref}
                  onBlur={field.onBlur}
                >
                  <SelectValue>
                    {(valor: string | null) =>
                      valor ? nombreResponsable[valor] : "Quien crea la orden"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {responsables.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {nombreResponsable[String(r.id)]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
            Modalidad
          </legend>
          <Controller
            control={control}
            name="modalidad"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={(valor) => field.onChange(valor as Modalidad)}
                className="flex gap-6"
              >
                {(["TALLER", "DOMICILIO"] as const).map((m) => (
                  <label
                    key={m}
                    htmlFor={`modalidad-${m}`}
                    className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <RadioGroupItem id={`modalidad-${m}`} value={m} />
                    {ETIQUETA_MODALIDAD[m]}
                  </label>
                ))}
              </RadioGroup>
            )}
          />
        </fieldset>

        {enDomicilio && (
          <>
            {texto("direccionVisita", "Dirección de la visita", {
              obligatorio: true,
              autoComplete: "street-address",
              placeholder: "Ej.: Calle 8 # 5-20, barrio Altico",
            })}
            <Field controlId="fechaVisita">
              <FieldLabel className="mb-1.5 block">
                Fecha de la visita
              </FieldLabel>
              <Input type="datetime-local" {...register("fechaVisita")} />
            </Field>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {/* También deshabilitado tras el éxito: mientras router.push navega,
            un segundo clic crearía otra orden. */}
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting || exito !== null}
        >
          {isSubmitting || exito !== null
            ? "Guardando..."
            : editando
              ? "Guardar cambios"
              : "Crear orden"}
        </Button>
        <Link
          href={editando ? `/ordenes/${orden!.id}` : "/ordenes"}
          className="inline-flex h-11 items-center px-3 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
