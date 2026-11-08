import { Rol } from '../../generated/prisma/enums';
import { PERMISOS } from './permisos';
import { tieneRolPermitido } from './roles';

describe('RolesGuard — decisión de acceso por rol', () => {
  // SWR-AUTH-008: Técnico en una ruta solo de Dueño es rechazado (el guard responde 403).
  it('Técnico en ruta solo Dueño: acceso denegado', () => {
    // Arrange
    const rolesRequeridos = [Rol.DUENO];

    // Act
    const permitido = tieneRolPermitido(rolesRequeridos, Rol.TECNICO);

    // Assert
    expect(permitido).toBe(false);
  });

  // SWR-AUTH-008: Dueño en una ruta solo de Dueño puede entrar.
  it('Dueño en ruta solo Dueño: acceso permitido', () => {
    // Arrange
    const rolesRequeridos = [Rol.DUENO];

    // Act
    const permitido = tieneRolPermitido(rolesRequeridos, Rol.DUENO);

    // Assert
    expect(permitido).toBe(true);
  });

  // SWR-AUTH-008: ruta sin @Roles() solo exige estar autenticado.
  it('ruta sin roles requeridos: cualquier rol autenticado entra', () => {
    // Arrange
    const rolesRequeridos = undefined;

    // Act
    const tecnico = tieneRolPermitido(rolesRequeridos, Rol.TECNICO);
    const dueno = tieneRolPermitido(rolesRequeridos, Rol.DUENO);

    // Assert
    expect(tecnico).toBe(true);
    expect(dueno).toBe(true);
  });

  // SWR-AUTH-008: sin rol en el token no se concede acceso a rutas con @Roles().
  it('usuario sin rol: acceso denegado', () => {
    // Arrange
    const rolesRequeridos = [Rol.DUENO, Rol.TECNICO];

    // Act
    const permitido = tieneRolPermitido(rolesRequeridos, undefined);

    // Assert
    expect(permitido).toBe(false);
  });

  // SWR-AUTH-008 / AJ-03: Técnico puede clientes, equipos, órdenes y pagos,
  // pero NO repuestos ni usuarios; Dueño puede todo.
  it('matriz AJ-03: permisos de Técnico y Dueño', () => {
    // Arrange
    const permitidosTecnico = ['clientes', 'equipos', 'ordenes', 'pagos'] as const;
    const negadosTecnico = ['repuestos', 'usuarios'] as const;

    // Act
    const tecnicoPermitido = permitidosTecnico.map((r) =>
      tieneRolPermitido(PERMISOS[r], Rol.TECNICO),
    );
    const tecnicoNegado = negadosTecnico.map((r) =>
      tieneRolPermitido(PERMISOS[r], Rol.TECNICO),
    );
    const duenoTodo = Object.values(PERMISOS).map((roles) =>
      tieneRolPermitido(roles, Rol.DUENO),
    );

    // Assert
    expect(tecnicoPermitido).toEqual([true, true, true, true]);
    expect(tecnicoNegado).toEqual([false, false]);
    expect(duenoTodo.every(Boolean)).toBe(true);
  });
});
