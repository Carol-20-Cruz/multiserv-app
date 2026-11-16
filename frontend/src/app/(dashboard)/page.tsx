import PageBreadcrumb from "@/components/common/page-breadcrumb";
import InicioContenido from "@/components/inicio";
import { obtenerDelBackend } from "@/lib/backend-sesion";
import { obtenerUsuarioActual } from "@/lib/sesion";
import type { ResumenStock } from "@/lib/tipos-inventario";
import type { ResumenOrdenes } from "@/lib/tipos-ordenes";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inicio",
};

export default async function InicioPage() {
  // El resumen de órdenes es para los dos roles (el backend no le envía
  // montos al Técnico). SWR-INV-009: solo el Dueño pide el stock bajo; al
  // Técnico el backend le respondería 403 (AJ-03).
  const usuario = await obtenerUsuarioActual();
  const [resumen, stock] = await Promise.all([
    obtenerDelBackend<ResumenOrdenes>("/ordenes/resumen"),
    usuario?.rol === "DUENO"
      ? obtenerDelBackend<ResumenStock>("/repuestos/resumen-stock")
      : Promise.resolve(null),
  ]);

  return (
    <div>
      <PageBreadcrumb pageTitle="Inicio" mostrarRuta={false} />
      <InicioContenido resumen={resumen} stockBajo={stock?.total} />
    </div>
  );
}
