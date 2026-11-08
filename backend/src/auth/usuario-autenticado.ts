import type { Request } from 'express';
import type { Rol } from '../generated/prisma/enums';

// Contenido del JWT (sub = id del usuario).
export interface PayloadJwt {
  sub: number;
  nombre: string;
  rol: Rol;
}

// Lo que el JwtAuthGuard deja en request.user.
export interface UsuarioAutenticado {
  id: number;
  nombre: string;
  rol: Rol;
}

export interface RequestConUsuario extends Request {
  user?: UsuarioAutenticado;
}
