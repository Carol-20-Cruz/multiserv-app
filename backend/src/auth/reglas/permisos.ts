import { Rol } from '../../generated/prisma/enums';

// Matriz de permisos — SWR-AUTH-008 con ajuste AJ-03.
// Dueño puede todo; Técnico puede clientes, equipos, órdenes y pagos,
// pero NO registrar repuestos ni administrar usuarios.
// Uso en módulos futuros: @Roles(...PERMISOS.repuestos)
export const PERMISOS = {
  clientes: [Rol.DUENO, Rol.TECNICO],
  equipos: [Rol.DUENO, Rol.TECNICO],
  ordenes: [Rol.DUENO, Rol.TECNICO],
  pagos: [Rol.DUENO, Rol.TECNICO],
  repuestos: [Rol.DUENO],
  usuarios: [Rol.DUENO],
} as const satisfies Record<string, readonly Rol[]>;
