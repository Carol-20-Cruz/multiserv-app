import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Rol } from '../../generated/prisma/enums';
import { JsonLogger } from '../../logging/json-logger';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { tieneRolPermitido } from '../reglas/roles';
import type { RequestConUsuario } from '../usuario-autenticado';

// Segundo portero — SWR-AUTH-008: revisa que el rol del usuario esté entre
// los permitidos por @Roles(). Va DESPUÉS de JwtAuthGuard:
// @UseGuards(JwtAuthGuard, RolesGuard)
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new JsonLogger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<Rol[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const request = context.switchToHttp().getRequest<RequestConUsuario>();

    if (!tieneRolPermitido(rolesRequeridos, request.user?.rol)) {
      // AJ-03: rastro del intento, sin datos personales. Se guarda el
      // patrón de la ruta (/repuestos/:id), no la URL real, para que nunca
      // salgan textos de búsqueda ni otros valores de la petición.
      this.logger.event('WARN', 'ACCESS_DENIED', 'Rol sin permiso', {
        userId: request.user?.id,
        rol: request.user?.rol,
        method: request.method,
        ruta: (request.route as { path?: string } | undefined)?.path,
      });
      throw new ForbiddenException('No tiene permisos para esta operación');
    }
    return true;
  }
}
