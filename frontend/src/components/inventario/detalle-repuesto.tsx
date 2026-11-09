import { Badge } from "@/components/ui/badge";
import { formatearPesos } from "@/lib/dinero";
import { formatearFecha } from "@/lib/fechas";
import type { RepuestoDetalle } from "@/lib/tipos-inventario";
import BadgeStock from "./badge-stock";

// Ficha del repuesto con su existencia y el indicador de stock bajo.
export default function DetalleRepuesto({
  repuesto,
}: {
  repuesto: RepuestoDetalle;
}) {
  const datos: [string, React.ReactNode][] = [
    ["Referencia", repuesto.referencia],
    ["Tipo de equipo", repuesto.tipoEquipo.nombre],
    ["Marca compatible", repuesto.marcaCompatible],
    ["Precio de venta", formatearPesos(repuesto.precioVenta)],
    [
      "Existencia",
      <span key="existencia" className="flex items-center gap-2">
        {repuesto.cantidad}
        <BadgeStock
          cantidad={repuesto.cantidad}
          minimo={repuesto.cantidadMinima}
        />
      </span>,
    ],
    ["Cantidad mínima (alerta)", repuesto.cantidadMinima],
    ["Registrado", formatearFecha(repuesto.creadoEn)],
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-800 dark:bg-white/3">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {repuesto.nombre}
        </h3>
        <Badge
          variant="light"
          color={repuesto.activo ? "success" : "error"}
          size="sm"
        >
          {repuesto.activo ? "Activo" : "Desactivado"}
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
