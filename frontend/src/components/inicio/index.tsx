"use client";

import { Badge } from "@/components/ui/badge";
import { useUsuario } from "@/context/sesion-context";
import { menusParaRol } from "@/layout/app-layout/sidebar/data";
import { NOMBRE_ROL } from "@/lib/tipos-sesion";
import Link from "next/link";
import TarjetaStockBajo from "@/components/inventario/tarjeta-stock-bajo";

interface InicioContenidoProps {
  // Repuestos en existencia baja; solo llega para el Dueño (SWR-INV-009).
  stockBajo?: number;
}

// Módulos que aún no existen: su tarjeta lleva "Próximamente".
const EN_CONSTRUCCION = new Set(["/ordenes"]);

// Contenido de la página de inicio: saludo y accesos a los módulos
// (tarjetas con el estilo de las metric cards de la plantilla).
export default function InicioContenido({ stockBajo }: InicioContenidoProps) {
  const usuario = useUsuario();
  const modulos = menusParaRol(usuario.rol).filter((item) => item.path !== "/");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 dark:border-gray-800 dark:bg-white/3">
        <h3 className="mb-2 text-title-sm font-semibold text-gray-800 dark:text-white/90">
          ¡Hola, {usuario.nombre}!
        </h3>
        <p className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          Ingresaste como
          <Badge
            variant="light"
            color={usuario.rol === "DUENO" ? "primary" : "warning"}
            size="sm"
          >
            {NOMBRE_ROL[usuario.rol]}
          </Badge>
        </p>
      </div>

      {usuario.rol === "DUENO" && stockBajo !== undefined && (
        <TarjetaStockBajo total={stockBajo} />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-3">
        {modulos.map((modulo) => (
          <Link
            key={modulo.path}
            href={modulo.path ?? "/"}
            className="group rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-brand-200 md:p-6 dark:border-gray-800 dark:bg-white/3 dark:hover:border-brand-500/40"
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
              {modulo.icon}
            </div>
            <div className="mt-5 flex items-end justify-between">
              <h4 className="text-title-sm font-semibold text-gray-800 dark:text-white/90">
                {modulo.label}
              </h4>
              {EN_CONSTRUCCION.has(modulo.path ?? "") && (
                <Badge variant="light" color="warning" size="sm">
                  Próximamente
                </Badge>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
