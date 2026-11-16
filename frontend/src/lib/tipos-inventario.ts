// Tipos de los datos de inventario que devuelve el backend.
// Sirven en servidor y navegador.

import type { TipoEquipo } from "./tipos-clientes";

export interface Repuesto {
  id: number;
  nombre: string;
  referencia: string;
  marcaCompatible: string;
  cantidad: number;
  cantidadMinima: number;
  precioVenta: number;
  activo: boolean;
  tipoEquipo: TipoEquipo;
  // SWR-INV-009: cantidad <= cantidadMinima (lo calcula el backend).
  stockBajo: boolean;
}

export interface PaginaRepuestos {
  datos: Repuesto[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface ResumenStock {
  total: number;
}

export type TipoMovimiento = "ENTRADA" | "SALIDA" | "AJUSTE";

export interface Movimiento {
  id: number;
  tipo: TipoMovimiento;
  cantidad: number;
  saldoResultante: number;
  proveedor: string | null;
  motivo: string | null;
  fecha: string;
  usuario: { nombre: string };
}

export interface RepuestoDetalle extends Repuesto {
  creadoEn: string;
  movimientos: Movimiento[];
}
