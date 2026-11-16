"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  mensajeDeError,
  MENSAJE_SIN_CONEXION,
  pedirApi,
} from "@/lib/api-navegador";
import { esEnteroTexto, limpiarEntero } from "@/lib/dinero";
import { esStockBajo } from "@/lib/stock";
import type { TipoEquipo } from "@/lib/tipos-clientes";
import type { Repuesto } from "@/lib/tipos-inventario";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { repuestoSchema, type RepuestoFormData } from "./schema";

interface RepuestoFormProps {
  tipos: TipoEquipo[];
  // Sin repuesto: registrar. Con repuesto: editar (sin tocar la cantidad).
  repuesto?: Repuesto;
}

const Obligatorio = () => (
  <span aria-hidden="true" className="text-red-500">
    {" "}
    *
  </span>
);

const aEntero = (valor: string) => Number(limpiarEntero(valor));

// SWR-INV-001 + AJ-05: registrar o editar un repuesto (solo Dueño).
export default function RepuestoForm({ tipos, repuesto }: RepuestoFormProps) {
  const router = useRouter();
  const editando = Boolean(repuesto);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  // true cuando ya se guardó y la página está navegando al detalle.
  const [guardado, setGuardado] = useState(false);
  const nombrePorId = Object.fromEntries(
    tipos.map((t) => [String(t.id), t.nombre]),
  );

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RepuestoFormData>({
    resolver: zodResolver(repuestoSchema),
    mode: "onTouched",
    defaultValues: {
      nombre: repuesto?.nombre ?? "",
      referencia: repuesto?.referencia ?? "",
      marcaCompatible: repuesto?.marcaCompatible ?? "",
      tipoEquipoId: repuesto ? String(repuesto.tipoEquipo.id) : "",
      precioVenta: repuesto ? String(repuesto.precioVenta) : "",
      // Al editar no se muestra ni se envía.
      cantidadInicial: repuesto ? "0" : "",
      cantidadMinima: String(repuesto?.cantidadMinima ?? 1),
    },
  });

  // SWR-INV-009: avisar ANTES de guardar si el repuesto quedará en
  // existencia baja (al registrar con la cantidad inicial; al editar con
  // la cantidad actual y el nuevo mínimo).
  const [cantidadInicial, cantidadMinima] = useWatch({
    control,
    name: ["cantidadInicial", "cantidadMinima"],
  });
  const cantidad = editando ? String(repuesto!.cantidad) : cantidadInicial;
  const quedaraBajo =
    esEnteroTexto(cantidad) &&
    esEnteroTexto(cantidadMinima) &&
    esStockBajo(aEntero(cantidad), aEntero(cantidadMinima));

  const enviar = async (datos: RepuestoFormData) => {
    setErrorServidor(null);
    const cuerpo = {
      nombre: datos.nombre,
      referencia: datos.referencia,
      marcaCompatible: datos.marcaCompatible,
      tipoEquipoId: Number(datos.tipoEquipoId),
      precioVenta: aEntero(datos.precioVenta),
      cantidadMinima: aEntero(datos.cantidadMinima),
      ...(editando ? {} : { cantidadInicial: aEntero(datos.cantidadInicial) }),
    };

    try {
      const res = editando
        ? await pedirApi<Repuesto>(
            `/api/repuestos/${repuesto!.id}`,
            "PATCH",
            cuerpo,
          )
        : await pedirApi<Repuesto>("/api/repuestos", "POST", cuerpo);

      // Referencia repetida (activa o desactivada): el error va en el campo.
      if (res.status === 409) {
        setError(
          "referencia",
          {
            message: mensajeDeError(res.cuerpo, "La referencia ya existe"),
          },
          { shouldFocus: true },
        );
        return;
      }
      if (!res.ok) {
        setErrorServidor(
          mensajeDeError(res.cuerpo, "No se pudo guardar el repuesto"),
        );
        return;
      }

      setGuardado(true);
      router.push(
        `/inventario/${res.cuerpo.id}?${editando ? "actualizado" : "registrado"}=1`,
      );
      router.refresh();
    } catch {
      setErrorServidor(MENSAJE_SIN_CONEXION);
    }
  };

  const campo = (
    nombre: Exclude<keyof RepuestoFormData, "tipoEquipoId">,
    etiqueta: string,
    props: React.ComponentProps<typeof Input> = {},
  ) => {
    const error = errors[nombre];
    return (
      <Field data-invalid={Boolean(error)} controlId={nombre}>
        <FieldLabel className="mb-1.5 block">
          {etiqueta}
          <Obligatorio />
        </FieldLabel>
        <Input
          {...props}
          {...register(nombre)}
          aria-invalid={error ? "true" : undefined}
          aria-required="true"
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

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {campo("nombre", "Nombre del repuesto", {
          placeholder: "Ej.: Tarjeta electrónica principal",
        })}
        {campo("referencia", "Referencia", {
          placeholder: "Ej.: BN44-00932A",
          autoCapitalize: "characters",
        })}
        {campo("marcaCompatible", "Marca compatible", {
          placeholder: "Ej.: Haceb, LG, Whirlpool",
        })}

        <Field
          data-invalid={Boolean(errors.tipoEquipoId)}
          controlId="tipoEquipoId"
        >
          <FieldLabel className="mb-1.5 block">
            Tipo de equipo
            <Obligatorio />
          </FieldLabel>
          <Controller
            control={control}
            name="tipoEquipoId"
            render={({ field }) => (
              <Select
                value={field.value || null}
                onValueChange={(valor) => field.onChange(valor ?? "")}
              >
                <SelectTrigger
                  id="tipoEquipoId"
                  ref={field.ref}
                  onBlur={field.onBlur}
                  aria-invalid={errors.tipoEquipoId ? "true" : undefined}
                  aria-required="true"
                >
                  <SelectValue>
                    {(valor: string | null) =>
                      valor ? nombrePorId[valor] : "Selecciona el tipo"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {tipos.map((tipo) => (
                    <SelectItem key={tipo.id} value={String(tipo.id)}>
                      {tipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.tipoEquipoId]} />
        </Field>

        {campo("precioVenta", "Precio de venta (COP)", {
          inputMode: "numeric",
          placeholder: "Ej.: 180.000",
        })}
        {!editando &&
          campo("cantidadInicial", "Cantidad inicial", {
            inputMode: "numeric",
            placeholder: "Ej.: 5",
          })}
        {campo("cantidadMinima", "Cantidad mínima (alerta)", {
          inputMode: "numeric",
        })}
      </div>

      {editando && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Existencia actual: {repuesto!.cantidad}. La cantidad solo cambia al
          registrar una entrada, para que quede el historial.
        </p>
      )}

      {quedaraBajo && (
        <Alert variant="warning" role="status">
          <AlertDescription className="text-amber-700 dark:text-amber-200">
            Con esta cantidad el repuesto quedará con existencia baja (llega o
            baja del mínimo) y aparecerá en la alerta del inventario.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-3">
        {/* También deshabilitado tras el éxito: mientras router.push navega,
            un segundo clic enviaría el repuesto otra vez. */}
        <Button type="submit" size="lg" disabled={isSubmitting || guardado}>
          {isSubmitting || guardado
            ? "Guardando..."
            : editando
              ? "Guardar cambios"
              : "Registrar repuesto"}
        </Button>
        <Link
          href={editando ? `/inventario/${repuesto!.id}` : "/inventario"}
          className="inline-flex h-11 items-center px-3 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
