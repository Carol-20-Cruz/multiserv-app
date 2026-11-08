import { Rol } from '../../generated/prisma/enums';

// Decisión del RolesGuard — SWR-AUTH-008.
// Función PURA: el guard solo la llama y responde 403 si devuelve false.
// - Ruta sin @Roles(): basta con estar autenticado.
// - Ruta con @Roles(...): el rol del usuario debe estar en la lista.
export function tieneRolPermitido(
  rolesRequeridos: readonly Rol[] | undefined,
  rolUsuario: Rol | undefined,
): boolean {
  if (!rolesRequeridos || rolesRequeridos.length === 0) {
    return true;
  }
  return rolUsuario !== undefined && rolesRequeridos.includes(rolUsuario);
}
