import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { PayloadJwt, RequestConUsuario } from '../usuario-autenticado';

// Portero de las rutas protegidas: exige un JWT válido y vigente en
// "Authorization: Bearer <token>". Si es válido, deja los datos en request.user.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    const [tipo, token] = request.headers.authorization?.split(' ') ?? [];
    if (tipo !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    try {
      const payload = await this.jwtService.verifyAsync<PayloadJwt>(token);
      request.user = { id: payload.sub, nombre: payload.nombre, rol: payload.rol };
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o vencido');
    }
  }
}
