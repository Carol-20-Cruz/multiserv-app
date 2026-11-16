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
import type { TipoEquipo } from "@/lib/tipos-clientes";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { equipoSchema, type EquipoFormData } from "./schema";

interface AgregarEquipoFormProps {
  clienteId: number;
  tipos: TipoEquipo[];
}

const VACIO: EquipoFormData = {
  tipoEquipoId: "",
  marca: "",
  referencia: "",
  serial: "",
};

const Obligatorio = () => (
  <span aria-hidden="true" className="text-red-500">
    {" "}
    *
  </span>
);

// SWR-EQP-003: asociar uno o más equipos al cliente.
export default function AgregarEquipoForm({
  clienteId,
  tipos,
}: AgregarEquipoFormProps) {
  const router = useRouter();
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const nombrePorId = Object.fromEntries(
    tipos.map((t) => [String(t.id), t.nombre]),
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EquipoFormData>({
    resolver: zodResolver(equipoSchema),
    mode: "onTouched",
    defaultValues: VACIO,
  });

  const enviar = async (datos: EquipoFormData) => {
    setErrorServidor(null);
    setExito(null);
    try {
      const res = await pedirApi(`/api/clientes/${clienteId}/equipos`, "POST", {
        ...datos,
        tipoEquipoId: Number(datos.tipoEquipoId),
      });
      if (!res.ok) {
        setErrorServidor(
          mensajeDeError(res.cuerpo, "No se pudo agregar el equipo"),
        );
        return;
      }
      setExito(
        `Equipo agregado: ${nombrePorId[datos.tipoEquipoId]} ${datos.marca}.`,
      );
      reset(VACIO); // listo para agregar otro
      // ?equipo=1 borra el aviso anterior de arriba ("Cliente registrado
      // correctamente."): el de esta acción se muestra junto al formulario.
      router.push(`/clientes/${clienteId}?equipo=1`, { scroll: false });
      router.refresh(); // la tabla de equipos se actualiza
    } catch {
      setErrorServidor(MENSAJE_SIN_CONEXION);
    }
  };

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-5">
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
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

        <Field data-invalid={Boolean(errors.marca)} controlId="marca">
          <FieldLabel className="mb-1.5 block">
            Marca
            <Obligatorio />
          </FieldLabel>
          <Input
            {...register("marca")}
            placeholder="Ej.: LG, Samsung"
            aria-invalid={errors.marca ? "true" : undefined}
            aria-required="true"
          />
          <FieldError errors={[errors.marca]} />
        </Field>

        <Field data-invalid={Boolean(errors.referencia)} controlId="referencia">
          <FieldLabel className="mb-1.5 block">Referencia</FieldLabel>
          <Input
            {...register("referencia")}
            placeholder="Opcional"
            aria-invalid={errors.referencia ? "true" : undefined}
          />
          <FieldError errors={[errors.referencia]} />
        </Field>

        <Field data-invalid={Boolean(errors.serial)} controlId="serial">
          <FieldLabel className="mb-1.5 block">Serial</FieldLabel>
          <Input
            {...register("serial")}
            placeholder="Opcional"
            aria-invalid={errors.serial ? "true" : undefined}
          />
          <FieldError errors={[errors.serial]} />
        </Field>
      </div>

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Agregando..." : "Agregar equipo"}
      </Button>
    </form>
  );
}
