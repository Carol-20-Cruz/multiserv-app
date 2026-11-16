import ComponentCard from "@/components/common/component-card";
import PageBreadcrumb from "@/components/common/page-breadcrumb";
import OrdenForm from "@/components/ordenes/orden-form";
import { obtenerDelBackend } from "@/lib/backend-sesion";
import type { OrdenDetalle, Responsable } from "@/lib/tipos-ordenes";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Editar orden",
};

// Editar los datos de la recepción. Una orden entregada no se edita.
export default async function EditarOrdenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) notFound();

  const [orden, responsables] = await Promise.all([
    obtenerDelBackend<OrdenDetalle>(`/ordenes/${id}`),
    obtenerDelBackend<Responsable[]>("/ordenes/responsables"),
  ]);
  if (!orden) notFound();
  if (orden.estado === "ENTREGADO") redirect(`/ordenes/${id}`);

  return (
    <div>
      <PageBreadcrumb pageTitle="Editar orden" />
      <ComponentCard
        title={`Orden ${orden.numero}`}
        desc="El cliente, el equipo y el estado no se cambian aquí."
      >
        <OrdenForm responsables={responsables ?? []} orden={orden} />
      </ComponentCard>
    </div>
  );
}
