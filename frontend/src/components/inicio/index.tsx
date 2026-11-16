"use client";

import TarjetaStockBajo from "@/components/inventario/tarjeta-stock-bajo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useUsuario } from "@/context/sesion-context";
import { menusParaRol } from "@/layout/app-layout/sidebar/data";
import type { ResumenOrdenes } from "@/lib/tipos-ordenes";
import { NOMBRE_ROL } from "@/lib/tipos-sesion";
import Link from "next/link";
import DistribucionEstados from "./distribucion-estados";
import OrdenesRecientes from "./ordenes-recientes";
import TarjetaSaldoPendiente from "./tarjeta-saldo-pendiente";
import TarjetasEstado from "./tarjetas-estado";

interface InicioContenidoProps {
  // GET /ordenes/resumen (null si no se pudo cargar).
  resumen: ResumenOrdenes | null;
  // Repuestos en existencia baja; solo llega para el Dueño (SWR-INV-009).
  stockBajo?: number;
}

// Inicio (dashboard) con datos reales: órdenes por estado, saldo pendiente
// y stock bajo (solo Dueño), distribución y órdenes recientes. Inspirado en
// el diseño logístico de TailAdmin, solo con Tailwind.
export default function InicioContenido({
  resumen,
  stockBajo,
}: InicioContenidoProps) {
  const usuario = useUsuario();
  const esDueno = usuario.rol === "DUENO";
  const modulos = menusParaRol(usuario.rol).filter((item) => item.path !== "/");
  const saldoTotal = esDueno ? resumen?.saldoPendienteTotal : undefined;
  const verStock = esDueno && stockBajo !== undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 md:flex-row md:items-center md:justify-between md:p-6 dark:border-gray-800 dark:bg-white/3">
        <div>
          <h3 className="mb-1 text-title-sm font-semibold text-gray-800 dark:text-white/90">
            ¡Hola, {usuario.nombre}!
          </h3>
          <p className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            Ingresaste como
            <Badge
              variant="light"
              color={esDueno ? "primary" : "warning"}
              size="sm"
            >
              {NOMBRE_ROL[usuario.rol]}
            </Badge>
          </p>
        </div>

        {/* Accesos a los módulos: fila compacta. */}
        <nav aria-label="Accesos rápidos">
          <ul className="flex flex-wrap gap-2">
            {modulos.map((modulo) => (
              <li key={modulo.path}>
                <Link
                  href={modulo.path ?? "/"}
                  className="text-theme-sm flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 font-medium text-gray-700 transition-colors hover:border-brand-200 hover:text-brand-500 dark:border-gray-800 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:text-brand-400 [&_svg]:size-5"
                >
                  {modulo.icon}
                  {modulo.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {resumen === null ? (
        <Alert variant="warning">
          <AlertDescription className="text-amber-700 dark:text-amber-200">
            No se pudo cargar el resumen de órdenes. Recarga la página en un
            momento.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <section aria-labelledby="titulo-estados" className="space-y-3">
            <h3
              id="titulo-estados"
              className="text-base font-semibold text-gray-800 dark:text-white/90"
            >
              Órdenes por estado
            </h3>
            <TarjetasEstado porEstado={resumen.porEstado} />
          </section>

          {(saldoTotal !== undefined || verStock) && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
              {saldoTotal !== undefined && (
                <TarjetaSaldoPendiente total={saldoTotal} />
              )}
              {verStock && <TarjetaStockBajo total={stockBajo} />}
            </div>
          )}

          <DistribucionEstados
            porEstado={resumen.porEstado}
            total={resumen.total}
          />

          <OrdenesRecientes ordenes={resumen.recientes} conSaldo={esDueno} />
        </>
      )}
    </div>
  );
}
