// SWR-INV-009: un repuesto está en existencia baja cuando su cantidad
// LLEGA o BAJA del mínimo. Copia de la regla del backend
// (backend/src/inventario/reglas/stock.ts) para avisar en el navegador
// antes de guardar; la decisión final la toma el backend.
export function esStockBajo(cantidad: number, minimo: number): boolean {
  return cantidad <= minimo;
}
