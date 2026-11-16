"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUsuario } from "@/context/sesion-context";
import { LogOutIcon } from "@/icons";
import { NOMBRE_ROL } from "@/lib/tipos-sesion";
import { getInitials } from "@/utils";

// Datos del usuario (de GET /auth/perfil) y botón visible de cerrar sesión.
// Basado en el user-dropdown de la plantilla.
export default function UsuarioSesion() {
  const usuario = useUsuario();

  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-500 dark:bg-brand-500/15 dark:text-brand-400"
      >
        {getInitials(usuario.nombre)}
      </span>

      <div className="flex flex-col items-start gap-0.5">
        <span className="text-sm font-medium text-gray-800 dark:text-white/90">
          {usuario.nombre}
        </span>
        <Badge
          variant="light"
          color={usuario.rol === "DUENO" ? "primary" : "warning"}
          size="sm"
        >
          {NOMBRE_ROL[usuario.rol]}
        </Badge>
      </div>

      {/* Formulario normal: funciona aunque falle el JavaScript. */}
      <form action="/api/auth/logout" method="post" className="ms-2">
        <Button type="submit" variant="outline" size="lg">
          <LogOutIcon />
          Cerrar sesión
        </Button>
      </form>
    </div>
  );
}
