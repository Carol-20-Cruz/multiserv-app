"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SesionProvider } from "@/context/sesion-context";
import AppHeader from "@/layout/app-layout/header";
import AppSidebar from "@/layout/app-layout/sidebar";
import UsuarioSesion from "@/layout/header/usuario-sesion";
import type { Usuario } from "@/lib/tipos-sesion";

// Estructura visual del dashboard de la plantilla: sidebar + header + contenido.
export default function DashboardShell({
  usuario,
  children,
}: {
  usuario: Usuario;
  children: React.ReactNode;
}) {
  return (
    <SesionProvider usuario={usuario}>
      <SidebarProvider>
        <AppSidebar />

        <SidebarInset>
          <AppHeader>
            <UsuarioSesion />
          </AppHeader>

          <div className="mx-auto w-full max-w-(--breakpoint-2xl) p-4 md:p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </SesionProvider>
  );
}
