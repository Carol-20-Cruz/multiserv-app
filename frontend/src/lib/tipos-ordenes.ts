// Tipos de los datos de órdenes de servicio que devuelve el backend.
// Sirven en servidor y navegador.

import type { Rol } from "./tipos-sesion";

export type EstadoOrden =
  | "RECIBIDO"
  | "EN_DIAGNOSTICO"
  | "EN_REPARACION"
  | "LISTO_PARA_ENTREGA"
  | "ENTREGADO";

export type Modalidad = "TALLER" | "DOMICILIO";

// SWR-ORD-011: la secuencia (igual que SECUENCIA_ESTADOS del backend).
export const SECUENCIA_ESTADOS: EstadoOrden[] = [
  "RECIBIDO",
  "EN_DIAGNOSTICO",
  "EN_REPARACION",
  "LISTO_PARA_ENTREGA",
  "ENTREGADO",
];

export const ETIQUETA_ESTADO: Record<EstadoOrden, string> = {
  RECIBIDO: "Recibido",
  EN_DIAGNOSTICO: "En diagnóstico",
  EN_REPARACION: "En reparación",
  LISTO_PARA_ENTREGA: "Listo para entrega",
  ENTREGADO: "Entregado",
};

export const ETIQUETA_MODALIDAD: Record<Modalidad, string> = {
  TALLER: "En el taller",
  DOMICILIO: "A domicilio",
};

export const esEstadoOrden = (valor: string): valor is EstadoOrden =>
  (SECUENCIA_ESTADOS as string[]).includes(valor);

export interface OrdenListado {
  id: number;
  numero: string;
  estado: EstadoOrden;
  modalidad: Modalidad;
  valorCotizado: number | null;
  creadoEn: string;
  cliente: { id: number; nombre: string; telefono: string };
  equipo: {
    id: number;
    marca: string;
    referencia: string | null;
    tipoEquipo: { nombre: string };
  };
  responsable: { id: number; nombre: string };
}

export interface PaginaOrdenes {
  datos: OrdenListado[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface Responsable {
  id: number;
  nombre: string;
  rol: Rol;
}

export interface CambioEstado {
  id: number;
  estadoAnterior: EstadoOrden | null;
  estadoNuevo: EstadoOrden;
  comentario: string | null;
  fecha: string;
  usuario: { nombre: string };
}

// Un "no" de las reglas del backend: motivo (para la lógica) y mensaje
// (para la persona).
export interface Bloqueo {
  motivo: string;
  mensaje: string;
}

export interface OrdenDetalle extends Omit<OrdenListado, "cliente" | "equipo"> {
  cliente: { id: number; nombre: string; telefono: string; activo: boolean };
  equipo: OrdenListado["equipo"] & { serial: string | null };
  direccionVisita: string | null;
  fechaVisita: string | null;
  fallaReportada: string;
  accesorios: string | null;
  estadoEquipo: string | null;
  porcentajeAbono: number;
  diasGarantia: number;
  diagnostico: string | null;
  aprobadaEn: string | null;
  actualizadoEn: string;
  creadoPor: { id: number; nombre: string };
  historialEstados: CambioEstado[];
  // Calculado por el backend con sus reglas puras.
  totalPagado: number;
  cantidadPagos: number;
  abonoMinimo: number | null;
  siguienteEstado: EstadoOrden | null;
  bloqueoSiguiente: Bloqueo | null;
  puedeCotizar: boolean;
  bloqueoCotizacion: Bloqueo | null;
}
