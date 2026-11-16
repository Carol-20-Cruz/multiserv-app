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
import { Textarea } from "@/components/ui/textarea";
import {
  mensajeDeError,
  MENSAJE_SIN_CONEXION,
  pedirApi,
} from "@/lib/api-navegador";
import { esEnteroTexto, formatearPesos, limpiarEntero } from "@/lib/dinero";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Mismos mensajes que validarValorCotizado del backend (SWR-CON-003):
// pesos enteros de 1 a 999.999.999. Se aceptan puntos de miles.
const VALOR_MAXIMO = 999_999_999;
const comoNumero = (v: string) => Number(limpiarEntero(v));

const cotizacionSchema = z.object({
  diagnostico: z
    .string()
    .trim()
    .min(1, "El diagnóstico es obligatorio")
    .max(1000, "El diagnóstico admite máximo 1000 caracteres"),
  valorCotizado: z
    .string()
    .trim()
    .min(1, "El valor cotizado es obligatorio")
    .refine(
      esEnteroTexto,
      "El valor cotizado debe ser un valor entero en pesos",
    )
    .refine(
      (v) => !esEnteroTexto(v) || comoNumero(v) >= 1,
      "El valor cotizado debe ser mayor que 0",
    )
    .refine(
      (v) => !esEnteroTexto(v) || comoNumero(v) <= VALOR_MAXIMO,
      "El valor cotizado no puede superar $ 999.999.999",
    ),
});

type CotizacionFormData = z.infer<typeof cotizacionSchema>;

interface RegistrarCotizacionProps {
  ordenId: number;
  porcentajeAbono: number;
  // Lo ya registrado (null si es la primera vez).
  diagnostico: string | null;
  valorCotizado: number | null;
}

// SWR-PAY-004 / AJ-09: registrar la cotización aprobada por el cliente
// (diagnóstico + valor) o corregirla mientras la orden no tenga pagos.
// La página solo lo muestra cuando el backend dice puedeCotizar.
export default function RegistrarCotizacion({
  ordenId,
  porcentajeAbono,
  diagnostico,
  valorCotizado,
}: RegistrarCotizacionProps) {
  const router = useRouter();
  const corrigiendo = valorCotizado !== null;
  const [abierto, setAbierto] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const inicial: CotizacionFormData = {
    diagnostico: diagnostico ?? "",
    valorCotizado: valorCotizado === null ? "" : String(valorCotizado),
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CotizacionFormData>({
    resolver: zodResolver(cotizacionSchema),
    mode: "onTouched",
    defaultValues: inicial,
  });

  const cambiarAbierto = (valor: boolean) => {
    setAbierto(valor);
    if (!valor) {
      reset(inicial);
      setErrorServidor(null);
    }
  };

  const enviar = async (datos: CotizacionFormData) => {
    setErrorServidor(null);
    try {
      const res = await pedirApi(`/api/ordenes/${ordenId}/cotizacion`, "PUT", {
        diagnostico: datos.diagnostico,
        valorCotizado: comoNumero(datos.valorCotizado),
      });
      if (!res.ok) {
        setErrorServidor(
          mensajeDeError(res.cuerpo, "No se pudo guardar la cotización"),
        );
        return;
      }
      setAbierto(false);
      setErrorServidor(null);
      // ?cotizacion=1 -> el aviso de éxito de esta acción.
      router.push(`/ordenes/${ordenId}?cotizacion=1`, { scroll: false });
      router.refresh();
    } catch {
      setErrorServidor(MENSAJE_SIN_CONEXION);
    }
  };

  const titulo = corrigiendo ? "Corregir cotización" : "Registrar cotización";

  return (
    <Dialog open={abierto} onOpenChange={cambiarAbierto}>
      <DialogTrigger
        render={
          <Button size="lg" variant={corrigiendo ? "outline" : "default"} />
        }
      >
        {titulo}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-5">
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription>
              Diagnóstico y valor que aprobó el cliente. El abono mínimo para
              pasar a reparación es el {porcentajeAbono} % de este valor.
              {valorCotizado !== null &&
                ` Valor actual: ${formatearPesos(valorCotizado)}. Solo se puede corregir mientras la orden no tenga pagos.`}
            </DialogDescription>
          </DialogHeader>

          {errorServidor && (
            <Alert variant="destructive">
              <AlertDescription className="text-red-700 dark:text-red-300">
                {errorServidor}
              </AlertDescription>
            </Alert>
          )}

          <Field
            data-invalid={Boolean(errors.diagnostico)}
            controlId="diagnostico"
          >
            <FieldLabel className="mb-1.5 block">
              Diagnóstico
              <span aria-hidden="true" className="text-red-500">
                {" "}
                *
              </span>
            </FieldLabel>
            <Textarea
              {...register("diagnostico")}
              rows={4}
              placeholder="Ej.: compresor dañado, se cambia y se recarga gas"
              aria-invalid={errors.diagnostico ? "true" : undefined}
              aria-required="true"
            />
            <FieldError errors={[errors.diagnostico]} />
          </Field>

          <Field
            data-invalid={Boolean(errors.valorCotizado)}
            controlId="valorCotizado"
          >
            <FieldLabel className="mb-1.5 block">
              Valor aprobado (pesos)
              <span aria-hidden="true" className="text-red-500">
                {" "}
                *
              </span>
            </FieldLabel>
            <Input
              {...register("valorCotizado")}
              inputMode="numeric"
              placeholder="Ej.: 180.000"
              aria-invalid={errors.valorCotizado ? "true" : undefined}
              aria-required="true"
            />
            <FieldError errors={[errors.valorCotizado]} />
          </Field>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar cotización"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
