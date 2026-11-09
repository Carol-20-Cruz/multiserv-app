import ComponentCard from "@/components/common/component-card";
import PageBreadcrumb from "@/components/common/page-breadcrumb";
import RepuestoForm from "@/components/inventario/repuesto-form";
import { obtenerDelBackend } from "@/lib/backend-sesion";
import { exigirDueno } from "@/lib/solo-dueno";
import type { TipoEquipo } from "@/lib/tipos-clientes";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nuevo repuesto",
};

// SWR-INV-001 + AJ-05: registrar un repuesto (solo Dueño, AJ-03).
export default async function NuevoRepuestoPage() {
  await exigirDueno();
  const tipos = await obtenerDelBackend<TipoEquipo[]>("/tipos-equipo");

  return (
    <div>
      <PageBreadcrumb pageTitle="Nuevo repuesto" />
      <ComponentCard
        title="Datos del repuesto"
        desc="Los campos con * son obligatorios. La cantidad inicial queda en el historial como «Stock inicial»."
      >
        <RepuestoForm tipos={tipos ?? []} />
      </ComponentCard>
    </div>
  );
}
