// Tipos y constantes de sesión que pueden usarse en servidor y navegador.

export const COOKIE_SESION = "ms_sesion";

export type Rol = "DUENO" | "TECNICO";

export interface Usuario {
  id: number;
  nombre: string;
  rol: Rol;
}

export const NOMBRE_ROL: Record<Rol, string> = {
  DUENO: "Dueño",
  TECNICO: "Técnico",
};
