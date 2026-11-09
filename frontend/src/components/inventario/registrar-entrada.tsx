"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  mensajeDeError,
  MENSAJE_SIN_CONEXION,
  pedirApi,
} from "@/lib/api-navegador";
import { esEnteroTexto, limpiarEntero } from "@/lib/dinero";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Misma regla que validarCantidadEntrada del backend: entero de 1 en adelante.
const entradaSchema = z.object({
  cantidad: z
    .string()
    .trim()
    .min(1, "La cantidad es obligatoria")
    .refine(esEnteroTexto, "La cantidad debe ser un número entero")
    .refine(
      (v) => !esEnteroTexto(v) || Number(limpiarEntero(v)) >= 1,
      "La cantidad debe ser 1 o mayor",
    ),
  proveedor: z
    .string()
    .trim()
    .max(120, "El proveedor admite máximo 120 caracteres"),
  motivo: z.string().trim().max(200, "El motivo admite máximo 200 caracteres"),
});

type EntradaFormData = z.infer<typeof entradaSchema>;

const VACIO: EntradaFormData = { cantidad: "", proveedor: "", motivo: "" };

interface RegistrarEntradaProps {
  repuestoId: number;
  nombre: string;
}

// Registrar repuestos que llegan del proveedor: suma stock y queda el
// movimiento ENTRADA en el historial.
export default function RegistrarEntrada({
  repuestoId,
  nombre,
}: RegistrarEntradaProps) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EntradaFormData>({
    resolver: zodResolver(entradaSchema),
    mode: "onTouched",
    defaultValues: VACIO,
  });

  const cambiarAbierto = (valor: boolean) => {
    setAbierto(valor);
    if (!valor) {
      reset(VACIO);
      setErrorServidor(null);
    }
  };

  const enviar = async (datos: EntradaFormData) => {
    setErrorServidor(null);
    const cantidad = Number(limpiarEntero(datos.cantidad));
    try {
      const res = await pedirApi(
        `/api/repuestos/${repuestoId}/entradas`,
        "POST",
        { ...datos, cantidad },
      );
      if (!res.ok) {
        setErrorServidor(
          mensajeDeError(res.cuerpo, "No se pudo registrar la entrada"),
        );
        return;
      }
      cambiarAbierto(false);
      router.push(`/inventario/${repuestoId}?entrada=${cantidad}`);
      router.refresh();
    } catch {
      setErrorServidor(MENSAJE_SIN_CONEXION);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={cambiarAbierto}>
      <DialogTrigger render={<Button size="lg" />}>
        Registrar entrada
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-5">
          <DialogHeader>
            <DialogTitle>Registrar entrada</DialogTitle>
            <DialogDescription>
              Unidades de «{nombre}» que llegaron del proveedor. Se suman a la
              existencia y quedan en el historial.
            </DialogDescription>
          </DialogHeader>

          {errorServidor && (
            <Alert variant="destructive">
              <AlertDescription className="text-red-700 dark:text-red-300">
                {errorServidor}
              </AlertDescription>
            </Alert>
          )}

          <Field data-invalid={Boolean(errors.cantidad)} controlId="cantidad">
            <FieldLabel className="mb-1.5 block">
              Cantidad que llegó
              <span aria-hidden="true" className="text-red-500">
                {" "}
                *
              </span>
            </FieldLabel>
            <Input
              {...register("cantidad")}
              inputMode="numeric"
              placeholder="Ej.: 4"
              aria-invalid={errors.cantidad ? "true" : undefined}
              aria-required="true"
            />
            <FieldError errors={[errors.cantidad]} />
          </Field>

          <Field data-invalid={Boolean(errors.proveedor)} controlId="proveedor">
            <FieldLabel className="mb-1.5 block">Proveedor</FieldLabel>
            <Input
              {...register("proveedor")}
              placeholder="Opcional"
              aria-invalid={errors.proveedor ? "true" : undefined}
            />
            <FieldError errors={[errors.proveedor]} />
          </Field>

          <Field data-invalid={Boolean(errors.motivo)} controlId="motivo">
            <FieldLabel className="mb-1.5 block">Nota</FieldLabel>
            <Input
              {...register("motivo")}
              placeholder="Opcional (ej.: factura 1234)"
              aria-invalid={errors.motivo ? "true" : undefined}
            />
            <FieldError errors={[errors.motivo]} />
          </Field>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Registrando..." : "Registrar entrada"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
