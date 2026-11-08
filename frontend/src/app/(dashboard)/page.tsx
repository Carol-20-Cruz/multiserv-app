import PageBreadcrumb from "@/components/common/page-breadcrumb";
import InicioContenido from "@/components/inicio";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inicio",
};

export default function InicioPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Inicio" mostrarRuta={false} />
      <InicioContenido />
    </div>
  );
}
