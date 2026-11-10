import type { EstadoOrden } from "@/lib/tipos-ordenes";

// Filtros de la lista de órdenes, tal como viajan en la URL.
// (Archivo sin "use client": lo usan el servidor y el navegador.)
export interface FiltrosOrdenes {
  buscar: string;
  estado: EstadoOrden | ""; // "" = todos
}

// URL de la lista con los filtros y la página.
export function urlOrdenes(filtros: FiltrosOrdenes, pagina = 1): string {
  const params = new URLSearchParams();
  if (filtros.buscar) params.set("buscar", filtros.buscar);
  if (filtros.estado) params.set("estado", filtros.estado);
  if (pagina > 1) params.set("pagina", String(pagina));
  const consulta = params.toString();
  return consulta ? `/ordenes?${consulta}` : "/ordenes";
}
