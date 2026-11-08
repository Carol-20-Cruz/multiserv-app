import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Rol } from '../../generated/prisma/enums';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { tieneRolPermitido } from '../reglas/roles';
import type { RequestConUsuario } from '../usuario-autenticado';

// Segundo portero — SWR-AUTH-008: revisa que el rol del usuario esté entre
// los permitidos por @Roles(). Va DESPUÉS de JwtAuthGuard:
// @UseGuards(JwtAuthGuard, RolesGuard)
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<Rol[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const request = context.switchToHttp().getRequest<RequestConUsuario>();

    if (!tieneRolPermitido(rolesRequeridos, request.user?.rol)) {
      throw new ForbiddenException('No tiene permisos para esta operación');
    }
    return true;
  }
}
