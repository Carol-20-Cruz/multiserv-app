import { formatearFecha } from "@/lib/fechas";
import { formatearTelefono } from "@/lib/telefono";
import { ETIQUETA_MODALIDAD, type OrdenDetalle } from "@/lib/tipos-ordenes";
import Link from "next/link";
import BadgeEstado from "./badge-estado";

// Ficha con los datos de la recepción de la orden.
export default function DetalleOrden({ orden }: { orden: OrdenDetalle }) {
  const equipo = [
    orden.equipo.tipoEquipo.nombre,
    orden.equipo.marca,
    orden.equipo.referencia,
  ]
    .filter(Boolean)
    .join(" ");

  const datos: [string, React.ReactNode][] = [
    [
      "Cliente",
      <Link
        key="cliente"
        href={`/clientes/${orden.cliente.id}`}
        className="text-brand-500 hover:underline dark:text-brand-400"
      >
        {orden.cliente.nombre}
      </Link>,
    ],
    ["Teléfono", formatearTelefono(orden.cliente.telefono)],
    ["Equipo", equipo],
    ["Serial", orden.equipo.serial ?? "—"],
    ["Modalidad", ETIQUETA_MODALIDAD[orden.modalidad]],
    ...(orden.modalidad === "DOMICILIO"
      ? ([
          ["Dirección de la visita", orden.direccionVisita ?? "—"],
          ["Fecha de la visita", formatearFecha(orden.fechaVisita)],
        ] as [string, string][])
      : []),
    ["Responsable", orden.responsable.nombre],
    ["Recibida", formatearFecha(orden.creadoEn)],
    ["Registrada por", orden.creadoPor.nombre],
    ["Accesorios", orden.accesorios ?? "—"],
    ["Estado en que llegó", orden.estadoEquipo ?? "—"],
    ["Garantía", `${orden.diasGarantia} días`],
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-800 dark:bg-white/3">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Orden {orden.numero}
        </h3>
        <BadgeEstado estado={orden.estado} size="default" />
      </div>

      <div className="mb-5">
        <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
          Falla reportada
        </p>
        <p className="text-sm font-medium break-words whitespace-pre-line text-gray-800 dark:text-white/90">
          {orden.fallaReportada}
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
        {datos.map(([etiqueta, valor]) => (
          <div key={etiqueta}>
            <dt className="mb-1 text-xs leading-normal text-gray-500 dark:text-gray-400">
              {etiqueta}
            </dt>
            <dd className="text-sm font-medium break-words text-gray-800 dark:text-white/90">
              {valor}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
