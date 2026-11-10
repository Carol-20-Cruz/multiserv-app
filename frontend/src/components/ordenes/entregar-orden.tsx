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
import { formatearPesos } from "@/lib/dinero";
import { formatearFecha } from "@/lib/fechas";
import type { OrdenDetalle } from "@/lib/tipos-ordenes";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Mismas reglas que EntregarOrdenDto: 3 a 100 caracteres, recortado. Solo
// el nombre, sin documento de identidad (minimización, Ley 1581).
const MENSAJE_LARGO =
  "El nombre de quien recibe debe tener entre 3 y 100 caracteres";
const entregaSchema = z.object({
  recibidoPorNombre: z
    .string()
    .trim()
    .min(1, "El nombre de quien recibe es obligatorio")
    .min(3, MENSAJE_LARGO)
    .max(100, MENSAJE_LARGO),
});

type EntregaFormData = z.infer<typeof entregaSchema>;

type EntregarOrdenProps = Pick<
  OrdenDetalle,
  | "estado"
  | "saldo"
  | "puedeEntregar"
  | "fechaEntrega"
  | "recibidoPorNombre"
  | "fechaVencGarantia"
  | "entregadoPor"
> & { ordenId: number };

// Por qué no se puede entregar todavía (null si se puede).
export function motivoNoEntrega({
  estado,
  saldo,
  puedeEntregar,
}: Pick<EntregarOrdenProps, "estado" | "saldo" | "puedeEntregar">):
  string | null {
  if (puedeEntregar) return null;
  if (estado !== "LISTO_PARA_ENTREGA") {
    return "Se entrega cuando la orden esté lista para entrega.";
  }
  if (saldo === null) {
    return "La orden no tiene cotización aprobada: no se puede entregar.";
  }
  return `Saldo pendiente ${formatearPesos(saldo)}: no se puede entregar`;
}

// SWR-ENT-003: entregar el equipo. Solo con la orden lista y saldo 0 (lo
// decide el backend: puedeEntregar). Ya entregada, muestra la entrega.
export default function EntregarOrden(props: EntregarOrdenProps) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EntregaFormData>({
    resolver: zodResolver(entregaSchema),
    mode: "onTouched",
    defaultValues: { recibidoPorNombre: "" },
  });

  if (props.estado === "ENTREGADO") {
    const datos: [string, string][] = [
      ["Entregada", formatearFecha(props.fechaEntrega)],
      ["Recibió", props.recibidoPorNombre ?? "—"],
      ["Entregó", props.entregadoPor?.nombre ?? "—"],
      ["Garantía hasta", formatearFecha(props.fechaVencGarantia)],
    ];
    return (
      <dl className="grid grid-cols-1 gap-x-8 gap-y-4 border-t border-gray-100 pt-5 sm:grid-cols-2 dark:border-gray-800">
        {datos.map(([etiqueta, valor]) => (
          <div key={etiqueta}>
            <dt className="mb-1 text-xs text-gray-500 dark:text-gray-400">
              {etiqueta}
            </dt>
            <dd className="text-sm font-medium break-words text-gray-800 dark:text-white/90">
              {valor}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  const motivo = motivoNoEntrega(props);

  const cambiarAbierto = (valor: boolean) => {
    setAbierto(valor);
    if (valor) setExito(false);
    if (!valor) {
      reset({ recibidoPorNombre: "" });
      setErrorServidor(null);
    }
  };

  const enviar = async (datos: EntregaFormData) => {
    setErrorServidor(null);
    try {
      const res = await pedirApi(
        `/api/ordenes/${props.ordenId}/entregar`,
        "POST",
        { recibidoPorNombre: datos.recibidoPorNombre },
      );
      if (!res.ok) {
        setErrorServidor(
          mensajeDeError(res.cuerpo, "No se pudo registrar la entrega"),
        );
        return;
      }
      setExito(true);
      setAbierto(false);
      router.push(`/ordenes/${props.ordenId}?entregada=1`, { scroll: false });
      router.refresh();
    } catch {
      setErrorServidor(MENSAJE_SIN_CONEXION);
    }
  };

  const ocupado = isSubmitting || exito;

  return (
    <div className="space-y-3 border-t border-gray-100 pt-5 dark:border-gray-800">
      <Dialog open={abierto} onOpenChange={cambiarAbierto}>
        <DialogTrigger
          render={
            <Button
              size="lg"
              variant="outline"
              disabled={motivo !== null}
              aria-describedby={motivo ? "bloqueo-entrega" : undefined}
            />
          }
        >
          Entregar equipo
        </DialogTrigger>
        <DialogContent>
          <form
            onSubmit={handleSubmit(enviar)}
            noValidate
            className="space-y-5"
          >
            <DialogHeader>
              <DialogTitle>Entregar equipo</DialogTitle>
              <DialogDescription>
                La orden pasa a «Entregado» y empieza a contar la garantía. No
                se puede deshacer.
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
              data-invalid={Boolean(errors.recibidoPorNombre)}
              controlId="recibidoPorNombre"
            >
              <FieldLabel className="mb-1.5 block">
                Recibido por
                <span aria-hidden="true" className="text-red-500">
                  {" "}
                  *
                </span>
              </FieldLabel>
              <Input
                {...register("recibidoPorNombre")}
                placeholder="Nombre de quien recoge el equipo"
                autoComplete="off"
                aria-invalid={errors.recibidoPorNombre ? "true" : undefined}
                aria-required="true"
              />
              <FieldError errors={[errors.recibidoPorNombre]} />
            </Field>

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button type="submit" disabled={ocupado}>
                {ocupado ? "Guardando..." : "Confirmar entrega"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {motivo && (
        <Alert variant="warning" id="bloqueo-entrega">
          <AlertDescription className="text-amber-700 dark:text-amber-200">
            {motivo}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
