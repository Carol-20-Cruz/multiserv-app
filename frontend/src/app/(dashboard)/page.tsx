import PageBreadcrumb from "@/components/common/page-breadcrumb";
import Proximamente from "@/components/common/proximamente";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inicio",
};

export default function InicioPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Inicio" />
      <Proximamente title="Bienvenido a MultiServ" />
    </div>
  );
}
