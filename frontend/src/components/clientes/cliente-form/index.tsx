"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  mensajeDeError,
  MENSAJE_SIN_CONEXION,
  pedirApi,
} from "@/lib/api-navegador";
import { errorTelefono, normalizarTelefono } from "@/lib/telefono";
import type {
  ClienteBasico,
  ClienteDetalle,
  RespuestaDuplicado,
} from "@/lib/tipos-clientes";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Controller,
  useForm,
  type FieldError as ErrorCampo,
} from "react-hook-form";
import AvisoDuplicado from "./aviso-duplicado";
import { clienteSchema, type ClienteFormData } from "./schema";

interface ClienteFormProps {
  // Sin cliente: registrar. Con cliente: editar sus datos de contacto.
  cliente?: ClienteDetalle;
}

const Obligatorio = () => (
  <span aria-hidden="true" className="text-red-500">
    {" "}
    *
  </span>
);

export default function ClienteForm({ cliente }: ClienteFormProps) {
  const router = useRouter();
  const editando = Boolean(cliente);
  const [duplicado, setDuplicado] = useState<ClienteBasico | null>(null);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const {
    register,
    control,
    getValues,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    mode: "onTouched",
    defaultValues: {
      nombre: cliente?.nombre ?? "",
      telefono: cliente?.telefono ?? "",
      telefonoAlterno: cliente?.telefonoAlterno ?? "",
      correo: cliente?.correo ?? "",
      direccion: cliente?.direccion ?? "",
      barrio: cliente?.barrio ?? "",
      ciudad: cliente?.ciudad ?? "Neiva",
      // Al editar no se pide de nuevo: ya quedó registrada al crear.
      autorizaDatos: editando,
    },
  });

  // SWR-CLI-004 / AJ-04: al salir del campo teléfono se pregunta si ya
  // existe, ANTES de enviar. El propio cliente (al editar) no cuenta.
  const verificarTelefono = async () => {
    const telefono = getValues("telefono");
    if (errorTelefono(telefono)) return;
    try {
      const { ok, cuerpo } = await pedirApi<{
        existe: boolean;
        cliente?: ClienteBasico;
      }>(
        `/api/clientes/verificar-telefono?telefono=${normalizarTelefono(telefono)}` +
          (cliente ? `&excluir=${cliente.id}` : ""),
      );
      const existente = ok && cuerpo.existe ? cuerpo.cliente : undefined;
      setDuplicado(
        existente && existente.id !== cliente?.id ? existente : null,
      );
    } catch {
      // Sin conexión: el backend vuelve a revisar al enviar.
    }
  };

  const enviar = async (datos: ClienteFormData) => {
    setErrorServidor(null);
    setExito(null);
    if (duplicado) return; // AJ-04: no se envía un teléfono repetido.

    const { autorizaDatos, ...contacto } = datos;
    const cuerpo = {
      ...contacto,
      telefono: normalizarTelefono(contacto.telefono),
      telefonoAlterno: normalizarTelefono(contacto.telefonoAlterno),
      ...(editando ? {} : { autorizaDatos }),
    };

    try {
      const res = editando
        ? await pedirApi<ClienteBasico>(
            `/api/clientes/${cliente!.id}`,
            "PATCH",
            cuerpo,
          )
        : await pedirApi<ClienteBasico>("/api/clientes", "POST", cuerpo);

      if (res.status === 409) {
        setDuplicado((res.cuerpo as unknown as RespuestaDuplicado).cliente);
        return;
      }
      if (!res.ok) {
        setErrorServidor(
          mensajeDeError(res.cuerpo, "No se pudo guardar el cliente"),
        );
        return;
      }

      setExito(
        editando
          ? "Datos del cliente actualizados correctamente."
          : "Cliente registrado correctamente.",
      );
      router.push(
        `/clientes/${res.cuerpo.id}?${editando ? "actualizado" : "registrado"}=1`,
      );
      router.refresh();
    } catch {
      setErrorServidor(MENSAJE_SIN_CONEXION);
    }
  };

  const campo = (
    nombre: keyof Omit<ClienteFormData, "autorizaDatos">,
    etiqueta: string,
    props: React.ComponentProps<typeof Input> & { obligatorio?: boolean } = {},
  ) => {
    const { obligatorio, ...inputProps } = props;
    const error = errors[nombre] as ErrorCampo | undefined;
    return (
      <Field data-invalid={Boolean(error)} controlId={nombre}>
        <FieldLabel className="mb-1.5 block">
          {etiqueta}
          {obligatorio && <Obligatorio />}
        </FieldLabel>
        <Input
          {...inputProps}
          {...register(nombre, {
            ...(nombre === "telefono" && {
              onBlur: verificarTelefono,
              onChange: () => setDuplicado(null),
            }),
          })}
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

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {campo("nombre", "Nombre completo", {
          obligatorio: true,
          autoComplete: "name",
          placeholder: "Ej.: María Pérez",
        })}
        <div className="space-y-3">
          {campo("telefono", "Teléfono", {
            obligatorio: true,
            type: "tel",
            inputMode: "numeric",
            autoComplete: "tel",
            placeholder: "300 123 4567",
          })}
          {duplicado && <AvisoDuplicado cliente={duplicado} />}
        </div>
        {campo("telefonoAlterno", "Teléfono alterno", {
          type: "tel",
          inputMode: "numeric",
          placeholder: "Opcional",
        })}
        {campo("correo", "Correo electrónico", {
          type: "email",
          autoComplete: "email",
          placeholder: "Opcional",
        })}
        {campo("direccion", "Dirección", { autoComplete: "street-address" })}
        {campo("barrio", "Barrio")}
        {campo("ciudad", "Ciudad")}
      </div>

      {!editando && (
        <Field
          orientation="horizontal"
          data-invalid={Boolean(errors.autorizaDatos)}
          controlId="autorizaDatos"
          className="items-start"
        >
          <Controller
            control={control}
            name="autorizaDatos"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onCheckedChange={(marcado) => field.onChange(marcado === true)}
                onBlur={field.onBlur}
                inputRef={field.ref}
                aria-invalid={errors.autorizaDatos ? "true" : undefined}
                className="mt-0.5"
              />
            )}
          />
          <div className="space-y-1">
            <FieldLabel>
              El cliente autoriza el tratamiento de sus datos personales (Ley
              1581 de 2012)
              <Obligatorio />
            </FieldLabel>
            <FieldError errors={[errors.autorizaDatos]} />
          </div>
        </Field>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting
            ? "Guardando..."
            : editando
              ? "Guardar cambios"
              : "Registrar cliente"}
        </Button>
        <Link
          href={editando ? `/clientes/${cliente!.id}` : "/clientes"}
          className="inline-flex h-11 items-center px-3 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
