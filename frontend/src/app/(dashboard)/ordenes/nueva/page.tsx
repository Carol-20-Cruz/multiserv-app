import ComponentCard from "@/components/common/component-card";
import PageBreadcrumb from "@/components/common/page-breadcrumb";
import OrdenForm from "@/components/ordenes/orden-form";
import { obtenerDelBackend } from "@/lib/backend-sesion";
import { obtenerUsuarioActual } from "@/lib/sesion";
import type { ClienteDetalle } from "@/lib/tipos-clientes";
import type { Responsable } from "@/lib/tipos-ordenes";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nueva orden",
};

interface NuevaOrdenPageProps {
  // Desde el detalle del cliente: "Nueva orden" en la fila del equipo.
  searchParams: Promise<{ clienteId?: string; equipoId?: string }>;
}

const idValido = (id?: string) => /^\d{1,9}$/.test(id ?? "");

// SWR-ORD-001: registrar una orden de servicio.
export default async function NuevaOrdenPage({
  searchParams,
}: NuevaOrdenPageProps) {
  const { clienteId, equipoId } = await searchParams;

  const [usuario, responsables, cliente] = await Promise.all([
    obtenerUsuarioActual(),
    obtenerDelBackend<Responsable[]>("/ordenes/responsables"),
    idValido(clienteId)
      ? obtenerDelBackend<ClienteDetalle>(`/clientes/${clienteId}`)
      : Promise.resolve(null),
  ]);

  return (
    <div>
      <PageBreadcrumb pageTitle="Nueva orden" />
      <ComponentCard
        title="Datos de la recepción"
        desc="Los campos con * son obligatorios. El número de la orden lo asigna el sistema."
      >
        <OrdenForm
          responsables={responsables ?? []}
          usuarioId={usuario?.id}
          // Un cliente desactivado no recibe órdenes: se elige otro.
          clienteInicial={cliente?.activo ? cliente : null}
          equipoInicialId={idValido(equipoId) ? Number(equipoId) : undefined}
        />
      </ComponentCard>
    </div>
  );
}
