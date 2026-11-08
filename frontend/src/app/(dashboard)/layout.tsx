import DashboardShell from "@/layout/app-layout/dashboard-shell";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { redirect } from "next/navigation";

// Portero de adentro: antes de mostrar cualquier página del dashboard le
// pregunta al backend quién es el usuario del token. Si el token venció o
// es inválido, borra la cookie y lleva al login.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) {
    redirect("/api/auth/expirada");
  }

  return <DashboardShell usuario={usuario}>{children}</DashboardShell>;
}
