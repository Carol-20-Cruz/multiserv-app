import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { enmascararCorreo } from '../logging/enmascarar';
import { JsonLogger } from '../logging/json-logger';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import {
  estaBloqueada,
  registrarIntentoFallido,
  reiniciarTrasLoginExitoso,
} from './reglas/bloqueo';
import type { PayloadJwt, UsuarioAutenticado } from './usuario-autenticado';

// SWR-AUTH-003: el mismo mensaje para correo inexistente, contraseña
// incorrecta y cuenta inactiva.
const MENSAJE_CREDENCIALES = 'Credenciales inválidas';
const MENSAJE_BLOQUEADA = 'Cuenta bloqueada temporalmente. Intente más tarde.';

export interface RespuestaLogin {
  accessToken: string;
  usuario: UsuarioAutenticado;
}

@Injectable()
export class AuthService {
  private readonly logger = new JsonLogger(AuthService.name);

  // Hash de relleno: si el correo no existe se compara igual contra él, para
  // que el tiempo de respuesta no delate qué dato falló (SWR-AUTH-003).
  private readonly hashFalso = bcrypt.hashSync('usuario-inexistente', 10);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<RespuestaLogin> {
    const correo = dto.correo.trim().toLowerCase();
    const ahora = new Date();
    const usuario = await this.prisma.usuario.findUnique({ where: { correo } });

    // Correo inexistente o cuenta inactiva (SWR-AUTH-007): rechazo genérico.
    if (!usuario || !usuario.activo) {
      await bcrypt.compare(dto.password, this.hashFalso);
      this.logger.event('WARN', 'LOGIN_FAILED', 'Inicio de sesión fallido', {
        ...(usuario ? { userId: usuario.id } : { correo: enmascararCorreo(correo) }),
        motivo: usuario ? 'CUENTA_INACTIVA' : 'USUARIO_NO_EXISTE',
      });
      throw new UnauthorizedException(MENSAJE_CREDENCIALES);
    }

    // SWR-AUTH-004: mientras dure el bloqueo no se revisa la contraseña.
    if (estaBloqueada(usuario.bloqueadoHasta, ahora)) {
      this.logger.event('WARN', 'LOGIN_FAILED', 'Intento sobre cuenta bloqueada', {
        userId: usuario.id,
        motivo: 'CUENTA_BLOQUEADA',
      });
      throw new HttpException(MENSAJE_BLOQUEADA, HttpStatus.LOCKED);
    }

    const passwordValida = await bcrypt.compare(dto.password, usuario.passwordHash);

    if (!passwordValida) {
      const resultado = registrarIntentoFallido(usuario, ahora);
      await this.prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          intentosFallidos: resultado.intentosFallidos,
          bloqueadoHasta: resultado.bloqueadoHasta,
        },
      });

      if (resultado.seBloqueo) {
        this.logger.event('WARN', 'ACCOUNT_LOCKED', 'Cuenta bloqueada por intentos fallidos', {
          userId: usuario.id,
          intentosFallidos: resultado.intentosFallidos,
          bloqueadoHasta: resultado.bloqueadoHasta?.toISOString(),
        });
        throw new HttpException(MENSAJE_BLOQUEADA, HttpStatus.LOCKED);
      }

      this.logger.event('WARN', 'LOGIN_FAILED', 'Inicio de sesión fallido', {
        userId: usuario.id,
        motivo: 'PASSWORD_INCORRECTA',
        intentosFallidos: resultado.intentosFallidos,
      });
      throw new UnauthorizedException(MENSAJE_CREDENCIALES);
    }

    // AJ-02: login correcto -> contador a 0 y sin bloqueo.
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: reiniciarTrasLoginExitoso(),
    });

    const payload: PayloadJwt = { sub: usuario.id, nombre: usuario.nombre, rol: usuario.rol };
    const accessToken = await this.jwtService.signAsync(payload);

    this.logger.event('INFO', 'LOGIN_SUCCESS', 'Inicio de sesión exitoso', {
      userId: usuario.id,
    });

    return {
      accessToken,
      usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
    };
  }
}
