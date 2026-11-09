import MensajeExito from "@/components/clientes/mensaje-exito";
import ComponentCard from "@/components/common/component-card";
import PageBreadcrumb from "@/components/common/page-breadcrumb";
import DesactivarRepuesto from "@/components/inventario/desactivar-repuesto";
import DetalleRepuesto from "@/components/inventario/detalle-repuesto";
import RegistrarEntrada from "@/components/inventario/registrar-entrada";
import TablaMovimientos from "@/components/inventario/tabla-movimientos";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { obtenerDelBackend } from "@/lib/backend-sesion";
import { exigirDueno } from "@/lib/solo-dueno";
import type { RepuestoDetalle } from "@/lib/tipos-inventario";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Detalle del repuesto",
};

interface DetallePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    registrado?: string;
    actualizado?: string;
    entrada?: string;
  }>;
}

// El aviso de la última acción (MensajeExito reemplaza al anterior).
function mensajeDeAviso(aviso: Awaited<DetallePageProps["searchParams"]>) {
  if (aviso.entrada) return "Entrada registrada correctamente.";
  if (aviso.actualizado)
    return "Datos del repuesto actualizados correctamente.";
  if (aviso.registrado) return "Repuesto registrado correctamente.";
  return null;
}

// Detalle del repuesto con su historial, "Registrar entrada" y desactivar.
export default async function DetalleRepuestoPage({
  params,
  searchParams,
}: DetallePageProps) {
  await exigirDueno();
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) notFound();

  const [repuesto, aviso] = await Promise.all([
    obtenerDelBackend<RepuestoDetalle>(`/repuestos/${id}`),
    searchParams,
  ]);
  if (!repuesto) notFound();

  return (
    <div>
      <PageBreadcrumb pageTitle="Detalle del repuesto" />

      <div className="space-y-6">
        {/* Siempre en el mismo lugar para que conserve su estado. */}
        <MensajeExito
          mensaje={mensajeDeAviso(aviso)}
          visible={repuesto.activo}
        />
        {!repuesto.activo && (
          <Alert variant="info" role="status">
            <AlertDescription className="text-gray-700 dark:text-gray-300">
              Este repuesto está desactivado: sus datos e historial se
              conservan, pero no aparece en el inventario ni en la alerta.
            </AlertDescription>
          </Alert>
        )}
        {repuesto.activo && repuesto.stockBajo && (
          <Alert variant="warning" role="alert">
            <AlertDescription className="text-amber-700 dark:text-amber-200">
              Existencia baja: quedan {repuesto.cantidad} y el mínimo es{" "}
              {repuesto.cantidadMinima}.
            </AlertDescription>
          </Alert>
        )}

        <DetalleRepuesto repuesto={repuesto} />

        <div className="flex flex-wrap gap-3">
          <Link
            href="/inventario"
            className={buttonVariants({ variant: "ghost", size: "lg" })}
          >
            Volver al inventario
          </Link>
          {repuesto.activo && (
            <>
              <RegistrarEntrada
                repuestoId={repuesto.id}
                nombre={repuesto.nombre}
              />
              <Link
                href={`/inventario/${repuesto.id}/editar`}
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Editar datos
              </Link>
              <DesactivarRepuesto
                repuestoId={repuesto.id}
                nombre={repuesto.nombre}
              />
            </>
          )}
        </div>

        <ComponentCard
          title="Historial de existencias"
          desc="Últimos 20 movimientos del repuesto."
        >
          <TablaMovimientos movimientos={repuesto.movimientos} />
        </ComponentCard>
      </div>
    </div>
  );
}
