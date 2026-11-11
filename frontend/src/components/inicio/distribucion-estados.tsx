import {
  ETIQUETA_ESTADO,
  SECUENCIA_ESTADOS,
  type EstadoOrden,
} from "@/lib/tipos-ordenes";
import { PUNTO_ESTADO } from "./tarjetas-estado";

// Porcentaje entero de cada estado sobre el total (0 si no hay órdenes).
export function porcentajes(
  porEstado: Record<EstadoOrden, number>,
  total: number,
): Record<EstadoOrden, number> {
  return Object.fromEntries(
    SECUENCIA_ESTADOS.map((e) => [
      e,
      total === 0 ? 0 : Math.round((porEstado[e] / total) * 100),
    ]),
  ) as Record<EstadoOrden, number>;
}

// Barra apilada (solo Tailwind) con la proporción de órdenes por estado,
// y su leyenda con número y porcentaje. La leyenda es el texto accesible.
export default function DistribucionEstados({
  porEstado,
  total,
}: {
  porEstado: Record<EstadoOrden, number>;
  total: number;
}) {
  const pct = porcentajes(porEstado, total);

  return (
    <section
      aria-labelledby="titulo-distribucion"
      className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 dark:border-gray-800 dark:bg-white/3"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3
          id="titulo-distribucion"
          className="text-base font-semibold text-gray-800 dark:text-white/90"
        >
          Distribución por estado
        </h3>
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {total === 1 ? "1 orden en total" : `${total} órdenes en total`}
        </p>
      </div>

      <div
        aria-hidden="true"
        className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
      >
        {SECUENCIA_ESTADOS.filter((e) => porEstado[e] > 0).map((estado) => (
          <div
            key={estado}
            data-estado={estado}
            className={`h-full ${PUNTO_ESTADO[estado]}`}
            style={{ width: `${(porEstado[estado] / total) * 100}%` }}
          />
        ))}
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-5">
        {SECUENCIA_ESTADOS.map((estado) => (
          <li
            key={estado}
            className="text-theme-sm flex items-center gap-2 text-gray-600 dark:text-gray-400"
          >
            <span
              aria-hidden="true"
              className={`size-2.5 shrink-0 rounded-full ${PUNTO_ESTADO[estado]}`}
            />
            <span>{ETIQUETA_ESTADO[estado]}</span>
            {/* El número y su porcentaje no se separan: si falta espacio
                se parte el nombre del estado, no "0 (0 %)". */}
            <span className="ms-auto shrink-0 font-medium whitespace-nowrap text-gray-800 tabular-nums xl:ms-0 dark:text-white/90">
              {porEstado[estado]} ({pct[estado]} %)
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
