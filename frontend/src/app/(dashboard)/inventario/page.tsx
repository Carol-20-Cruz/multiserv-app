import PageBreadcrumb from "@/components/common/page-breadcrumb";
import Proximamente from "@/components/common/proximamente";
import { obtenerUsuarioActual } from "@/lib/sesion";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Inventario",
};

// Solo Dueño (AJ-03). Ocultar el menú no basta: si un Técnico escribe la
// URL, se le devuelve al inicio. La protección real de los datos la hace el
// backend con RolesGuard cuando exista el módulo de repuestos.
export default async function InventarioPage() {
  const usuario = await obtenerUsuarioActual();
  if (usuario?.rol !== "DUENO") {
    redirect("/");
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Inventario" />
      <Proximamente
        title="Inventario: próximamente"
        description="Aquí podrás registrar repuestos y controlar sus existencias."
      />
    </div>
  );
}
