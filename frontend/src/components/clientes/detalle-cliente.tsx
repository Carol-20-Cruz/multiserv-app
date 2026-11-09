import { Badge } from "@/components/ui/badge";
import { formatearFecha } from "@/lib/fechas";
import { formatearTelefono } from "@/lib/telefono";
import type { ClienteDetalle } from "@/lib/tipos-clientes";

// Ficha con los datos de contacto del cliente.
export default function DetalleCliente({
  cliente,
}: {
  cliente: ClienteDetalle;
}) {
  const datos: [string, string][] = [
    ["Teléfono", formatearTelefono(cliente.telefono)],
    [
      "Teléfono alterno",
      cliente.telefonoAlterno
        ? formatearTelefono(cliente.telefonoAlterno)
        : "—",
    ],
    ["Correo electrónico", cliente.correo ?? "—"],
    ["Dirección", cliente.direccion ?? "—"],
    ["Barrio", cliente.barrio ?? "—"],
    ["Ciudad", cliente.ciudad],
    [
      "Autorización de datos (Ley 1581)",
      cliente.autorizaDatos
        ? `Sí, ${formatearFecha(cliente.fechaAutorizacion)}`
        : "No registrada",
    ],
    ["Registrado", formatearFecha(cliente.creadoEn)],
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-800 dark:bg-white/3">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {cliente.nombre}
        </h3>
        <Badge
          variant="light"
          color={cliente.activo ? "success" : "error"}
          size="sm"
        >
          {cliente.activo ? "Activo" : "Desactivado"}
        </Badge>
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
