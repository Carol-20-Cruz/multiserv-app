import ClienteForm from "@/components/clientes/cliente-form";
import ComponentCard from "@/components/common/component-card";
import PageBreadcrumb from "@/components/common/page-breadcrumb";
import { obtenerDelBackend } from "@/lib/backend-sesion";
import type { ClienteDetalle } from "@/lib/tipos-clientes";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Editar cliente",
};

// Editar datos de contacto. Un cliente desactivado no se edita.
export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) notFound();

  const cliente = await obtenerDelBackend<ClienteDetalle>(`/clientes/${id}`);
  if (!cliente) notFound();
  if (!cliente.activo) redirect(`/clientes/${id}`);

  return (
    <div>
      <PageBreadcrumb pageTitle="Editar cliente" />
      <ComponentCard
        title={`Datos de contacto de ${cliente.nombre}`}
        desc="Si cambias el teléfono, se verifica que no pertenezca a otro cliente."
      >
        <ClienteForm cliente={cliente} />
      </ComponentCard>
    </div>
  );
}
