import PageBreadcrumb from "@/components/common/page-breadcrumb";
import InicioContenido from "@/components/inicio";
import { obtenerDelBackend } from "@/lib/backend-sesion";
import { obtenerUsuarioActual } from "@/lib/sesion";
import type { ResumenStock } from "@/lib/tipos-inventario";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inicio",
};

export default async function InicioPage() {
  // SWR-INV-009: solo el Dueño ve (y pide) el resumen de stock bajo; al
  // Técnico el backend le respondería 403 (AJ-03).
  const usuario = await obtenerUsuarioActual();
  const resumen =
    usuario?.rol === "DUENO"
      ? await obtenerDelBackend<ResumenStock>("/repuestos/resumen-stock")
      : null;

  return (
    <div>
      <PageBreadcrumb pageTitle="Inicio" mostrarRuta={false} />
      <InicioContenido stockBajo={resumen?.total} />
    </div>
  );
}
