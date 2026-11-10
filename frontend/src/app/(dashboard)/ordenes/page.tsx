import PageBreadcrumb from "@/components/common/page-breadcrumb";
import FiltrosOrdenes from "@/components/ordenes/filtros-ordenes";
import PaginacionOrdenes from "@/components/ordenes/paginacion-ordenes";
import TablaOrdenes from "@/components/ordenes/tabla-ordenes";
import type { FiltrosOrdenes as Filtros } from "@/components/ordenes/url-ordenes";
import { buttonVariants } from "@/components/ui/button";
import { obtenerDelBackend } from "@/lib/backend-sesion";
import {
  ETIQUETA_ESTADO,
  esEstadoOrden,
  type PaginaOrdenes,
} from "@/lib/tipos-ordenes";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Órdenes",
};

interface OrdenesPageProps {
  searchParams: Promise<{ buscar?: string; estado?: string; pagina?: string }>;
}

// SWR-ORD-001: órdenes de servicio, las más nuevas primero, con buscador
// (número, cliente o teléfono) y filtro por estado. Dueño y Técnico (AJ-03).
export default async function OrdenesPage({ searchParams }: OrdenesPageProps) {
  const sp = await searchParams;
  const filtros: Filtros = {
    buscar: (sp.buscar ?? "").trim().slice(0, 100),
    estado: esEstadoOrden(sp.estado ?? "")
      ? (sp.estado as Filtros["estado"])
      : "",
  };
  const pagina = /^\d{1,6}$/.test(sp.pagina ?? "")
    ? Math.max(1, Number(sp.pagina))
    : 1;

  const params = new URLSearchParams({ pagina: String(pagina) });
  if (filtros.buscar) params.set("buscar", filtros.buscar);
  if (filtros.estado) params.set("estado", filtros.estado);

  const resultado = await obtenerDelBackend<PaginaOrdenes>(
    `/ordenes?${params.toString()}`,
  );
  const datos = resultado ?? { datos: [], total: 0, pagina: 1, porPagina: 10 };
  const totalPaginas = Math.ceil(datos.total / datos.porPagina);
  const filtrando = Boolean(filtros.buscar || filtros.estado);

  return (
    <div>
      <PageBreadcrumb pageTitle="Órdenes" />

      <div className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <FiltrosOrdenes filtros={filtros} />
          <Link
            href="/ordenes/nueva"
            className={buttonVariants({ size: "lg", className: "shrink-0" })}
          >
            Nueva orden
          </Link>
        </div>

        <p
          className="text-sm text-gray-500 dark:text-gray-400"
          aria-live="polite"
        >
          {filtrando
            ? `${datos.total} orden(es) con los filtros aplicados` +
              (filtros.estado
                ? ` (estado «${ETIQUETA_ESTADO[filtros.estado]}»)`
                : "")
            : `${datos.total} orden(es) registrada(s)`}
        </p>

        <TablaOrdenes ordenes={datos.datos} filtrando={filtrando} />

        <PaginacionOrdenes
          pagina={datos.pagina}
          totalPaginas={totalPaginas}
          filtros={filtros}
        />
      </div>
    </div>
  );
}
