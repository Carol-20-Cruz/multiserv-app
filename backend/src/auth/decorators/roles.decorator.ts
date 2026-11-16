import { SetMetadata } from '@nestjs/common';
import type { Rol } from '../../generated/prisma/enums';

export const ROLES_KEY = 'roles';

// Marca una ruta con los roles que pueden usarla — SWR-AUTH-008.
// Ejemplo: @Roles(...PERMISOS.repuestos)  -> solo Dueño.
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
