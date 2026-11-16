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
import {
  ETIQUETA_ESTADO,
  type Bloqueo,
  type EstadoOrden,
} from "@/lib/tipos-ordenes";
import { useRouter } from "next/navigation";
import { useState } from "react";

const MAX_COMENTARIO = 300;

interface AvanzarEstadoProps {
  ordenId: number;
  estado: EstadoOrden;
  // Lo calcula el backend con las mismas reglas que valida al guardar.
  siguienteEstado: EstadoOrden | null;
  bloqueo: Bloqueo | null;
  abonoMinimo: number | null;
  totalPagado: number;
}

// SWR-ORD-011 / AJ-07 / AJ-10: pasar la orden al SIGUIENTE estado (nunca
// saltar ni volver). Si una regla lo impide, el botón queda deshabilitado
// y se explica por qué. El backend vuelve a revisar al guardar (409).
export default function AvanzarEstado({
  ordenId,
  estado,
  siguienteEstado,
  bloqueo,
  abonoMinimo,
  totalPagado,
}: AvanzarEstadoProps) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [comentario, setComentario] = useState("");
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!siguienteEstado) {
    return (
      <Alert variant="info" role="status">
        <AlertDescription className="text-gray-700 dark:text-gray-300">
          {estado === "ENTREGADO"
            ? "La orden ya fue entregada: su estado no cambia."
            : "El equipo está listo. La entrega se registra con «Entregar equipo», que exige el saldo en cero."}
        </AlertDescription>
      </Alert>
    );
  }

  const destino = ETIQUETA_ESTADO[siguienteEstado];
  const comentarioLargo = comentario.trim().length > MAX_COMENTARIO;

  const cambiarAbierto = (valor: boolean) => {
    setAbierto(valor);
    if (!valor) {
      setComentario("");
      setErrorServidor(null);
    }
  };

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (comentarioLargo) return;
    setErrorServidor(null);
    setEnviando(true);
    try {
      const res = await pedirApi(`/api/ordenes/${ordenId}/estado`, "POST", {
        // Se envía el estado AL QUE se pasa: un doble clic no salta dos.
        estadoNuevo: siguienteEstado,
        comentario: comentario.trim() || null,
      });
      if (!res.ok) {
        setErrorServidor(
          mensajeDeError(res.cuerpo, "No se pudo cambiar el estado"),
        );
        return;
      }
      cambiarAbierto(false);
      router.push(`/ordenes/${ordenId}?estado=1`, { scroll: false });
      router.refresh();
    } catch {
      setErrorServidor(MENSAJE_SIN_CONEXION);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-3">
      <Dialog open={abierto} onOpenChange={cambiarAbierto}>
        <DialogTrigger
          render={
            <Button
              size="lg"
              disabled={Boolean(bloqueo)}
              aria-describedby={bloqueo ? "bloqueo-estado" : undefined}
            />
          }
        >
          Pasar a «{destino}»
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={confirmar} noValidate className="space-y-5">
            <DialogHeader>
              <DialogTitle>¿Pasar la orden a «{destino}»?</DialogTitle>
              <DialogDescription>
                Pasa de «{ETIQUETA_ESTADO[estado]}» a «{destino}». Queda en el
                historial con tu nombre y no se puede devolver.
              </DialogDescription>
            </DialogHeader>

            {errorServidor && (
              <Alert variant="destructive">
                <AlertDescription className="text-red-700 dark:text-red-300">
                  {errorServidor}
                </AlertDescription>
              </Alert>
            )}

            <Field data-invalid={comentarioLargo} controlId="comentario">
              <FieldLabel className="mb-1.5 block">Comentario</FieldLabel>
              <Input
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Opcional (ej.: se pidió el repuesto)"
                aria-invalid={comentarioLargo ? "true" : undefined}
              />
              <FieldError
                errors={[
                  comentarioLargo
                    ? {
                        message: `El comentario admite máximo ${MAX_COMENTARIO} caracteres`,
                      }
                    : undefined,
                ]}
              />
            </Field>

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button type="submit" disabled={enviando}>
                {enviando ? "Guardando..." : "Confirmar cambio"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {bloqueo && (
        <Alert variant="warning" id="bloqueo-estado">
          <AlertDescription className="text-amber-700 dark:text-amber-200">
            {bloqueo.mensaje}
            {bloqueo.motivo === "FALTA_ABONO" && abonoMinimo !== null && (
              <>
                {" "}
                (mínimo {formatearPesos(abonoMinimo)}; pagado{" "}
                {formatearPesos(totalPagado)}).
              </>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
