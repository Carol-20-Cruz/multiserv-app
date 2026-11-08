import PageBreadcrumb from "@/components/common/page-breadcrumb";
import Proximamente from "@/components/common/proximamente";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clientes",
};

export default function ClientesPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Clientes" />
      <Proximamente
        title="Clientes: próximamente"
        description="Aquí podrás registrar y buscar clientes y sus equipos."
      />
    </div>
  );
}
