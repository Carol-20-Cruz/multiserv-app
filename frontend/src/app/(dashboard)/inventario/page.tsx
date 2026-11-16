import PageBreadcrumb from "@/components/common/page-breadcrumb";
import AlertaStockBajo from "@/components/inventario/alerta-stock-bajo";
import FiltrosInventario from "@/components/inventario/filtros-inventario";
import PaginacionInventario from "@/components/inventario/paginacion-inventario";
import TablaRepuestos from "@/components/inventario/tabla-repuestos";
import type { FiltrosActuales } from "@/components/inventario/url-inventario";
import { buttonVariants } from "@/components/ui/button";
import { obtenerDelBackend } from "@/lib/backend-sesion";
import { exigirDueno } from "@/lib/solo-dueno";
import type { TipoEquipo } from "@/lib/tipos-clientes";
import type { PaginaRepuestos, ResumenStock } from "@/lib/tipos-inventario";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Inventario",
};

interface InventarioPageProps {
  searchParams: Promise<{
    buscar?: string;
    tipoEquipoId?: string;
    soloStockBajo?: string;
    pagina?: string;
  }>;
}

// SWR-INV-001 + SWR-INV-009: lista de repuestos activos con la alerta de
// existencia baja. Solo Dueño (AJ-03).
export default async function InventarioPage({
  searchParams,
}: InventarioPageProps) {
  await exigirDueno();

  const sp = await searchParams;
  const filtros: FiltrosActuales = {
    buscar: (sp.buscar ?? "").trim().slice(0, 100),
    tipoEquipoId: /^\d{1,9}$/.test(sp.tipoEquipoId ?? "")
      ? sp.tipoEquipoId!
      : "",
    soloStockBajo: sp.soloStockBajo === "1",
  };
  const pagina = /^\d{1,6}$/.test(sp.pagina ?? "")
    ? Math.max(1, Number(sp.pagina))
    : 1;

  const params = new URLSearchParams({ pagina: String(pagina) });
  if (filtros.buscar) params.set("buscar", filtros.buscar);
  if (filtros.tipoEquipoId) params.set("tipoEquipoId", filtros.tipoEquipoId);
  if (filtros.soloStockBajo) params.set("soloStockBajo", "1");

  const [resultado, resumen, tipos] = await Promise.all([
    obtenerDelBackend<PaginaRepuestos>(`/repuestos?${params.toString()}`),
    obtenerDelBackend<ResumenStock>("/repuestos/resumen-stock"),
    obtenerDelBackend<TipoEquipo[]>("/tipos-equipo"),
  ]);
  const datos = resultado ?? { datos: [], total: 0, pagina: 1, porPagina: 10 };
  const totalPaginas = Math.ceil(datos.total / datos.porPagina);
  const filtrando = Boolean(
    filtros.buscar || filtros.tipoEquipoId || filtros.soloStockBajo,
  );

  return (
    <div>
      <PageBreadcrumb pageTitle="Inventario" />

      <div className="space-y-5">
        <AlertaStockBajo
          total={resumen?.total ?? 0}
          filtrando={filtros.soloStockBajo}
        />

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <FiltrosInventario filtros={filtros} tipos={tipos ?? []} />
          <Link
            href="/inventario/nuevo"
            className={buttonVariants({ size: "lg", className: "shrink-0" })}
          >
            Nuevo repuesto
          </Link>
        </div>

        <p
          className="text-sm text-gray-500 dark:text-gray-400"
          aria-live="polite"
        >
          {filtrando
            ? `${datos.total} repuesto(s) con los filtros aplicados`
            : `${datos.total} repuesto(s) activo(s)`}
        </p>

        <TablaRepuestos repuestos={datos.datos} filtrando={filtrando} />

        <PaginacionInventario
          pagina={datos.pagina}
          totalPaginas={totalPaginas}
          filtros={filtros}
        />
      </div>
    </div>
  );
}
