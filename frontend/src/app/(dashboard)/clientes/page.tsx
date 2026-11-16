import PageBreadcrumb from "@/components/common/page-breadcrumb";
import BuscadorClientes from "@/components/clientes/buscador-clientes";
import PaginacionClientes from "@/components/clientes/paginacion-clientes";
import TablaClientes from "@/components/clientes/tabla-clientes";
import { buttonVariants } from "@/components/ui/button";
import { obtenerDelBackend } from "@/lib/backend-sesion";
import type { PaginaClientes } from "@/lib/tipos-clientes";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Clientes",
};

interface ClientesPageProps {
  searchParams: Promise<{ buscar?: string; pagina?: string }>;
}

// Listado de clientes activos con buscador (nombre o teléfono) y paginación.
export default async function ClientesPage({
  searchParams,
}: ClientesPageProps) {
  const { buscar = "", pagina = "1" } = await searchParams;
  const textoBuscar = buscar.trim().slice(0, 100);
  const numeroPagina = /^\d{1,6}$/.test(pagina)
    ? Math.max(1, Number(pagina))
    : 1;

  const params = new URLSearchParams({ pagina: String(numeroPagina) });
  if (textoBuscar) params.set("buscar", textoBuscar);
  const resultado = await obtenerDelBackend<PaginaClientes>(
    `/clientes?${params.toString()}`,
  );
  const datos = resultado ?? {
    datos: [],
    total: 0,
    pagina: 1,
    porPagina: 10,
  };
  const totalPaginas = Math.ceil(datos.total / datos.porPagina);

  return (
    <div>
      <PageBreadcrumb pageTitle="Clientes" />

      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <BuscadorClientes buscar={textoBuscar} />
          <Link
            href="/clientes/nuevo"
            className={buttonVariants({ size: "lg", className: "shrink-0" })}
          >
            Nuevo cliente
          </Link>
        </div>

        <p
          className="text-sm text-gray-500 dark:text-gray-400"
          aria-live="polite"
        >
          {textoBuscar
            ? `${datos.total} resultado(s) para “${textoBuscar}”`
            : `${datos.total} cliente(s) activo(s)`}
        </p>

        <TablaClientes clientes={datos.datos} buscando={Boolean(textoBuscar)} />

        <PaginacionClientes
          pagina={datos.pagina}
          totalPaginas={totalPaginas}
          buscar={textoBuscar}
        />
      </div>
    </div>
  );
}
