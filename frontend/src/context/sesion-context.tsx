"use client";

import type { Usuario } from "@/lib/tipos-sesion";
import { createContext, useContext } from "react";

// Usuario de la sesión (id, nombre, rol), obtenido en el servidor desde
// GET /auth/perfil. El token NO está aquí: vive solo en la cookie httpOnly.
const SesionContext = createContext<Usuario | null>(null);

export function SesionProvider({
  usuario,
  children,
}: {
  usuario: Usuario;
  children: React.ReactNode;
}) {
  return (
    <SesionContext.Provider value={usuario}>{children}</SesionContext.Provider>
  );
}

export function useUsuario(): Usuario {
  const usuario = useContext(SesionContext);
  if (!usuario) {
    throw new Error("useUsuario debe usarse dentro de SesionProvider");
  }
  return usuario;
}
