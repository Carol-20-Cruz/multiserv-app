import { formatearFecha } from "@/lib/fechas";
import { ETIQUETA_ESTADO, type CambioEstado } from "@/lib/tipos-ordenes";
import BadgeEstado from "./badge-estado";

// SWR-ORD-011: historial de estados, del más antiguo al más reciente.
// Cada paso dice quién lo hizo, cuándo y el comentario (si lo hubo).
export default function LineaTiempo({
  historial,
}: {
  historial: CambioEstado[];
}) {
  if (historial.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Sin cambios de estado registrados.
      </p>
    );
  }

  return (
    <ol className="relative space-y-6 border-s border-gray-200 ps-6 dark:border-gray-800">
      {historial.map((cambio) => (
        <li key={cambio.id} className="relative">
          <span
            aria-hidden="true"
            className="absolute -start-[1.95rem] top-1 size-3 rounded-full border-2 border-white bg-brand-500 dark:border-gray-900"
          />
          <div className="flex flex-wrap items-center gap-2">
            <BadgeEstado estado={cambio.estadoNuevo} />
            <span className="text-theme-xs text-gray-500 dark:text-gray-400">
              {cambio.estadoAnterior
                ? `desde «${ETIQUETA_ESTADO[cambio.estadoAnterior]}»`
                : "recepción del equipo"}
            </span>
          </div>
          <p className="text-theme-sm mt-1 text-gray-600 dark:text-gray-400">
            {formatearFecha(cambio.fecha)} · {cambio.usuario.nombre}
          </p>
          {cambio.comentario && (
            <p className="mt-1 text-sm break-words text-gray-800 dark:text-white/90">
              {cambio.comentario}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
