import ClienteForm from "@/components/clientes/cliente-form";
import ComponentCard from "@/components/common/component-card";
import PageBreadcrumb from "@/components/common/page-breadcrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nuevo cliente",
};

// SWR-CLI-001: registrar un cliente.
export default function NuevoClientePage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Nuevo cliente" />
      <ComponentCard
        title="Datos del cliente"
        desc="Los campos con * son obligatorios."
      >
        <ClienteForm />
      </ComponentCard>
    </div>
  );
}
