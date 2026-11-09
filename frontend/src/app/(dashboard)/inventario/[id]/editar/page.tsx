import ComponentCard from "@/components/common/component-card";
import PageBreadcrumb from "@/components/common/page-breadcrumb";
import RepuestoForm from "@/components/inventario/repuesto-form";
import { obtenerDelBackend } from "@/lib/backend-sesion";
import { exigirDueno } from "@/lib/solo-dueno";
import type { TipoEquipo } from "@/lib/tipos-clientes";
import type { RepuestoDetalle } from "@/lib/tipos-inventario";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Editar repuesto",
};

// Editar datos y mínimo. Un repuesto desactivado no se edita.
export default async function EditarRepuestoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirDueno();
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) notFound();

  const [repuesto, tipos] = await Promise.all([
    obtenerDelBackend<RepuestoDetalle>(`/repuestos/${id}`),
    obtenerDelBackend<TipoEquipo[]>("/tipos-equipo"),
  ]);
  if (!repuesto) notFound();
  if (!repuesto.activo) redirect(`/inventario/${id}`);

  return (
    <div>
      <PageBreadcrumb pageTitle="Editar repuesto" />
      <ComponentCard
        title={`Datos de ${repuesto.nombre}`}
        desc="Si cambias la referencia, se verifica que no pertenezca a otro repuesto."
      >
        <RepuestoForm tipos={tipos ?? []} repuesto={repuesto} />
      </ComponentCard>
    </div>
  );
}
