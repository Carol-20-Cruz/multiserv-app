import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService, RespuestaLogin } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import type { RequestConUsuario, UsuarioAutenticado } from './usuario-autenticado';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // SWR-AUTH-001: iniciar sesión con correo y contraseña.
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<RespuestaLogin> {
    return this.authService.login(dto);
  }

  // Ruta protegida de prueba: devuelve los datos del token.
  @Get('perfil')
  @UseGuards(JwtAuthGuard, RolesGuard)
  perfil(@Req() req: RequestConUsuario): UsuarioAutenticado {
    return req.user as UsuarioAutenticado;
  }
}
