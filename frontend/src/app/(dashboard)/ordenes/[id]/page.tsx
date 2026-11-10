import MensajeExito from "@/components/clientes/mensaje-exito";
import ComponentCard from "@/components/common/component-card";
import PageBreadcrumb from "@/components/common/page-breadcrumb";
import AvanzarEstado from "@/components/ordenes/avanzar-estado";
import CuentaOrden from "@/components/ordenes/cuenta-orden";
import DetalleOrden from "@/components/ordenes/detalle-orden";
import LineaTiempo from "@/components/ordenes/linea-tiempo";
import RegistrarCotizacion from "@/components/ordenes/registrar-cotizacion";
import { buttonVariants } from "@/components/ui/button";
import { obtenerDelBackend } from "@/lib/backend-sesion";
import { formatearPesos } from "@/lib/dinero";
import { formatearFecha } from "@/lib/fechas";
import type { OrdenDetalle } from "@/lib/tipos-ordenes";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Detalle de la orden",
};

interface DetallePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    creada?: string;
    actualizada?: string;
    cotizacion?: string;
    estado?: string;
    pago?: string;
  }>;
}

// El aviso de la última acción (MensajeExito reemplaza al anterior).
function mensajeDeAviso(aviso: Awaited<DetallePageProps["searchParams"]>) {
  if (aviso.pago) return "Pago registrado correctamente.";
  if (aviso.estado) return "Estado actualizado correctamente.";
  if (aviso.cotizacion) return "Cotización guardada correctamente.";
  if (aviso.actualizada) return "Orden actualizada correctamente.";
  if (aviso.creada) return "Orden creada correctamente.";
  return null;
}

// Detalle de la orden: recepción, cotización aprobada, cambio de estado e
// historial, cuenta y pagos (SWR-ORD-001, SWR-ORD-011, SWR-PAY-004).
export default async function DetalleOrdenPage({
  params,
  searchParams,
}: DetallePageProps) {
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) notFound();

  const [orden, aviso] = await Promise.all([
    obtenerDelBackend<OrdenDetalle>(`/ordenes/${id}`),
    searchParams,
  ]);
  if (!orden) notFound();

  const cotizacion: [string, string][] = [
    [
      "Valor aprobado",
      orden.valorCotizado === null ? "—" : formatearPesos(orden.valorCotizado),
    ],
    ["Aprobada", formatearFecha(orden.aprobadaEn)],
    [
      `Abono mínimo (${orden.porcentajeAbono} %)`,
      orden.abonoMinimo === null ? "—" : formatearPesos(orden.abonoMinimo),
    ],
  ];

  return (
    <div>
      <PageBreadcrumb pageTitle="Detalle de la orden" />

      <div className="space-y-6">
        {/* Siempre en el mismo lugar para que conserve su estado. */}
        <MensajeExito mensaje={mensajeDeAviso(aviso)} visible />

        <DetalleOrden orden={orden} />

        <div className="flex flex-wrap gap-3">
          <Link
            href="/ordenes"
            className={buttonVariants({ variant: "ghost", size: "lg" })}
          >
            Volver al listado
          </Link>
          {orden.estado !== "ENTREGADO" && (
            <Link
              href={`/ordenes/${orden.id}/editar`}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Editar datos
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ComponentCard
            title="Cotización aprobada"
            desc="Se registra en diagnóstico y se corrige solo mientras no haya pagos."
          >
            <div className="space-y-5">
              <div>
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                  Diagnóstico
                </p>
                <p className="text-sm font-medium break-words whitespace-pre-line text-gray-800 dark:text-white/90">
                  {orden.diagnostico ?? "—"}
                </p>
              </div>
              <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                {cotizacion.map(([etiqueta, valor]) => (
                  <div key={etiqueta}>
                    <dt className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                      {etiqueta}
                    </dt>
                    <dd className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {valor}
                    </dd>
                  </div>
                ))}
              </dl>
              {orden.puedeCotizar ? (
                <RegistrarCotizacion
                  ordenId={orden.id}
                  porcentajeAbono={orden.porcentajeAbono}
                  diagnostico={orden.diagnostico}
                  valorCotizado={orden.valorCotizado}
                />
              ) : (
                orden.bloqueoCotizacion && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {orden.bloqueoCotizacion.mensaje}.
                  </p>
                )
              )}
            </div>
          </ComponentCard>

          <ComponentCard
            title="Cuenta"
            desc="Los pagos se descuentan del valor aprobado y nunca lo superan."
          >
            <CuentaOrden
              id={orden.id}
              estado={orden.estado}
              valorCotizado={orden.valorCotizado}
              totalPagado={orden.totalPagado}
              saldo={orden.saldo}
              abonoMinimo={orden.abonoMinimo}
              pagos={orden.pagos}
            />
          </ComponentCard>

          <ComponentCard
            className="xl:col-span-2"
            title="Estado de la orden"
            desc="Los estados avanzan en orden y quedan en el historial."
          >
            <div className="space-y-6">
              <AvanzarEstado
                ordenId={orden.id}
                estado={orden.estado}
                siguienteEstado={orden.siguienteEstado}
                bloqueo={orden.bloqueoSiguiente}
                abonoMinimo={orden.abonoMinimo}
                totalPagado={orden.totalPagado}
              />
              <LineaTiempo historial={orden.historialEstados} />
            </div>
          </ComponentCard>
        </div>
      </div>
    </div>
  );
}
