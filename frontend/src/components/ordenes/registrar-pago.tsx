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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  mensajeDeError,
  MENSAJE_SIN_CONEXION,
  pedirApi,
} from "@/lib/api-navegador";
import { esEnteroTexto, formatearPesos, limpiarEntero } from "@/lib/dinero";
import { ETIQUETA_MEDIO, type MedioPago } from "@/lib/tipos-ordenes";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

const comoNumero = (v: string) => Number(limpiarEntero(v));
const MEDIOS: MedioPago[] = ["EFECTIVO", "TRANSFERENCIA"];

// Mismos mensajes que validarPago del backend (SWR-PAY-004). El tope es el
// saldo: pagar exactamente el saldo es válido; un peso más, no.
function crearSchema(saldo: number) {
  return z.object({
    valor: z
      .string()
      .trim()
      .min(1, "El valor del pago es obligatorio")
      .refine(
        esEnteroTexto,
        "El valor del pago debe ser un valor entero en pesos",
      )
      .refine(
        (v) => !esEnteroTexto(v) || comoNumero(v) >= 1,
        "El valor del pago debe ser mayor que 0",
      )
      .refine(
        (v) => !esEnteroTexto(v) || comoNumero(v) <= saldo,
        `El pago no puede superar el saldo pendiente (${formatearPesos(saldo)})`,
      ),
    medio: z.enum(["EFECTIVO", "TRANSFERENCIA"], {
      message: "Elige el medio de pago",
    }),
    referencia: z
      .string()
      .trim()
      .max(60, "La referencia admite máximo 60 caracteres"),
  });
}

type PagoFormData = z.infer<ReturnType<typeof crearSchema>>;

interface RegistrarPagoProps {
  ordenId: number;
  saldo: number;
  abonoMinimo: number | null;
  totalPagado: number;
}

// Lo que se sugiere pagar: lo que falta del abono mínimo (AJ-10) o, si ya
// se cubrió, todo el saldo.
export function valorSugerido(
  saldo: number,
  abonoMinimo: number | null,
  totalPagado: number,
): number {
  const faltaAbono = (abonoMinimo ?? 0) - totalPagado;
  return faltaAbono > 0 ? Math.min(faltaAbono, saldo) : saldo;
}

// SWR-PAY-004: registrar un abono o el pago del saldo. El tipo (abono o
// saldo) lo decide el backend. La página solo lo muestra con saldo > 0.
export default function RegistrarPago({
  ordenId,
  saldo,
  abonoMinimo,
  totalPagado,
}: RegistrarPagoProps) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  // Tras el éxito el botón sigue deshabilitado mientras se navega.
  const [exito, setExito] = useState(false);

  const sugerido = valorSugerido(saldo, abonoMinimo, totalPagado);
  const sugiereAbono = sugerido < saldo;
  const inicial: PagoFormData = {
    valor: String(sugerido),
    medio: "EFECTIVO",
    referencia: "",
  };

  const schema = useMemo(() => crearSchema(saldo), [saldo]);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PagoFormData>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: inicial,
  });

  const valorEscrito = useWatch({ control, name: "valor" }) ?? "";
  const valorNumero = esEnteroTexto(valorEscrito)
    ? comoNumero(valorEscrito)
    : null;
  const valorEnRango =
    valorNumero !== null && valorNumero >= 1 && valorNumero <= saldo;

  const cambiarAbierto = (valor: boolean) => {
    setAbierto(valor);
    if (valor) setExito(false);
    if (!valor) {
      reset(inicial);
      setErrorServidor(null);
    }
  };

  const enviar = async (datos: PagoFormData) => {
    setErrorServidor(null);
    try {
      const res = await pedirApi(`/api/ordenes/${ordenId}/pagos`, "POST", {
        valor: comoNumero(datos.valor),
        medio: datos.medio,
        referencia: datos.referencia || null,
      });
      if (!res.ok) {
        setErrorServidor(
          mensajeDeError(res.cuerpo, "No se pudo registrar el pago"),
        );
        return;
      }
      setExito(true);
      setAbierto(false);
      // ?pago=1 -> el aviso de éxito de esta acción.
      router.push(`/ordenes/${ordenId}?pago=1`, { scroll: false });
      router.refresh();
    } catch {
      setErrorServidor(MENSAJE_SIN_CONEXION);
    }
  };

  const ocupado = isSubmitting || exito;

  return (
    <Dialog open={abierto} onOpenChange={cambiarAbierto}>
      <DialogTrigger render={<Button size="lg" />}>
        Registrar pago
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-5">
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
            <DialogDescription>
              Saldo pendiente: {formatearPesos(saldo)}.{" "}
              {sugiereAbono
                ? `Se sugiere el abono mínimo que falta (${formatearPesos(sugerido)}) para pasar a reparación.`
                : "Se sugiere pagar todo el saldo."}
            </DialogDescription>
          </DialogHeader>

          {errorServidor && (
            <Alert variant="destructive">
              <AlertDescription className="text-red-700 dark:text-red-300">
                {errorServidor}
              </AlertDescription>
            </Alert>
          )}

          <Field data-invalid={Boolean(errors.valor)} controlId="valorPago">
            <FieldLabel className="mb-1.5 block">
              Valor (pesos)
              <span aria-hidden="true" className="text-red-500">
                {" "}
                *
              </span>
            </FieldLabel>
            <Input
              {...register("valor")}
              inputMode="numeric"
              placeholder="Ej.: 125.000"
              aria-invalid={errors.valor ? "true" : undefined}
              aria-required="true"
              aria-describedby="tipoPago"
            />
            <FieldError errors={[errors.valor]} />
            <p
              id="tipoPago"
              className="text-theme-xs mt-1.5 text-gray-500 dark:text-gray-400"
            >
              {valorEnRango
                ? valorNumero === saldo
                  ? "Cubre todo el saldo: queda registrado como pago del saldo."
                  : `Queda registrado como abono. Saldo después del pago: ${formatearPesos(saldo - valorNumero)}.`
                : `Máximo ${formatearPesos(saldo)}.`}
            </p>
          </Field>

          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Medio de pago
            </legend>
            <Controller
              control={control}
              name="medio"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={(valor) => field.onChange(valor as MedioPago)}
                  className="flex gap-6"
                >
                  {MEDIOS.map((m) => (
                    <label
                      key={m}
                      htmlFor={`medio-${m}`}
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <RadioGroupItem id={`medio-${m}`} value={m} />
                      {ETIQUETA_MEDIO[m]}
                    </label>
                  ))}
                </RadioGroup>
              )}
            />
          </fieldset>

          <Field
            data-invalid={Boolean(errors.referencia)}
            controlId="referenciaPago"
          >
            <FieldLabel className="mb-1.5 block">Referencia</FieldLabel>
            <Input
              {...register("referencia")}
              placeholder="Opcional (ej.: número de la transferencia)"
              aria-invalid={errors.referencia ? "true" : undefined}
            />
            <FieldError errors={[errors.referencia]} />
          </Field>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={ocupado}>
              {ocupado ? "Guardando..." : "Guardar pago"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
