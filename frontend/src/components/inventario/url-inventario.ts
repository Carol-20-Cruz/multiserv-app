// Filtros de la lista de inventario, tal como viajan en la URL.
// (Archivo sin "use client": lo usan el servidor y el navegador.)
export interface FiltrosActuales {
  buscar: string;
  tipoEquipoId: string; // "" = todos
  soloStockBajo: boolean;
}

// URL de la lista con los filtros y la página.
export function urlInventario(filtros: FiltrosActuales, pagina = 1): string {
  const params = new URLSearchParams();
  if (filtros.buscar) params.set("buscar", filtros.buscar);
  if (filtros.tipoEquipoId) params.set("tipoEquipoId", filtros.tipoEquipoId);
  if (filtros.soloStockBajo) params.set("soloStockBajo", "1");
  if (pagina > 1) params.set("pagina", String(pagina));
  const consulta = params.toString();
  return consulta ? `/inventario?${consulta}` : "/inventario";
}
