// Tipos de los datos de clientes y equipos que devuelve el backend.
// Sirven en servidor y navegador.

export interface ClienteBasico {
  id: number;
  nombre: string;
  telefono: string;
  activo: boolean;
}

export interface ClienteListado extends ClienteBasico {
  barrio: string | null;
  ciudad: string;
  equipos: number;
}

export interface PaginaClientes {
  datos: ClienteListado[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface TipoEquipo {
  id: number;
  nombre: string;
}

export interface Equipo {
  id: number;
  marca: string;
  referencia: string | null;
  serial: string | null;
  creadoEn: string;
  tipoEquipo: TipoEquipo;
}

export interface ClienteDetalle extends ClienteBasico {
  telefonoAlterno: string | null;
  correo: string | null;
  direccion: string | null;
  barrio: string | null;
  ciudad: string;
  autorizaDatos: boolean;
  fechaAutorizacion: string | null;
  creadoEn: string;
  equipos: Equipo[];
}

// Respuesta 409 del backend cuando el teléfono ya existe (AJ-04).
export interface RespuestaDuplicado {
  message: string;
  cliente: ClienteBasico;
}
