import { urlOrdenes } from "@/components/ordenes/url-ordenes";
import {
  ETIQUETA_ESTADO,
  SECUENCIA_ESTADOS,
  type EstadoOrden,
} from "@/lib/tipos-ordenes";
import Link from "next/link";

// Un color por estado, el mismo tono del badge (COLOR_ESTADO).
export const PUNTO_ESTADO: Record<EstadoOrden, string> = {
  RECIBIDO: "bg-gray-400",
  EN_DIAGNOSTICO: "bg-sky-500",
  EN_REPARACION: "bg-amber-500",
  LISTO_PARA_ENTREGA: "bg-brand-500 dark:bg-brand-400",
  ENTREGADO: "bg-green-500",
};

const cantidadOrdenes = (n: number) => (n === 1 ? "1 orden" : `${n} órdenes`);

// Tarjetas con el número de órdenes por estado; cada una lleva a la lista
// filtrada (/ordenes?estado=...).
export default function TarjetasEstado({
  porEstado,
}: {
  porEstado: Record<EstadoOrden, number>;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 xl:grid-cols-5">
      {SECUENCIA_ESTADOS.map((estado) => (
        <li key={estado}>
          <Link
            href={urlOrdenes({ buscar: "", estado })}
            aria-label={`${cantidadOrdenes(porEstado[estado])} en «${ETIQUETA_ESTADO[estado]}»: ver la lista`}
            className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-brand-200 md:p-5 dark:border-gray-800 dark:bg-white/3 dark:hover:border-brand-500/40"
          >
            <span className="text-theme-sm flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <span
                aria-hidden="true"
                className={`size-2.5 shrink-0 rounded-full ${PUNTO_ESTADO[estado]}`}
              />
              {ETIQUETA_ESTADO[estado]}
            </span>
            <span className="mt-3 text-title-sm font-bold text-gray-800 tabular-nums dark:text-white/90">
              {porEstado[estado]}
            </span>
            <span className="text-theme-xs mt-1 text-brand-500 group-hover:underline dark:text-brand-400">
              Ver órdenes
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
