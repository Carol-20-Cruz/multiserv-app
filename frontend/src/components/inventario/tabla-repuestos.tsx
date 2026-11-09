import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearPesos } from "@/lib/dinero";
import type { Repuesto } from "@/lib/tipos-inventario";
import Link from "next/link";
import BadgeStock from "./badge-stock";

interface TablaRepuestosProps {
  repuestos: Repuesto[];
  filtrando: boolean;
}

const celdaEncabezado =
  "px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";
const celda =
  "px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400";

// Tabla de la plantilla (basic-table) con los repuestos de la página.
// SWR-INV-009: la fila de un repuesto en existencia baja lleva su indicador.
export default function TablaRepuestos({
  repuestos,
  filtrando,
}: TablaRepuestosProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="max-w-full overflow-x-auto">
        <Table>
          <caption className="sr-only">Repuestos del inventario</caption>
          <TableHeader className="border-b border-gray-100 dark:border-gray-800">
            <TableRow>
              {[
                "Repuesto",
                "Referencia",
                "Tipo de equipo",
                "Marca",
                "Existencia",
                "Precio de venta",
              ].map((titulo) => (
                <TableCell
                  key={titulo}
                  isHeader
                  scope="col"
                  className={celdaEncabezado}
                >
                  {titulo}
                </TableCell>
              ))}
              <TableCell isHeader scope="col" className={celdaEncabezado}>
                <span className="sr-only">Acciones</span>
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {repuestos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className={`${celda} text-center`}>
                  {filtrando
                    ? "No hay repuestos con esos filtros."
                    : "Aún no hay repuestos registrados."}
                </TableCell>
              </TableRow>
            ) : (
              repuestos.map((repuesto) => (
                <TableRow
                  key={repuesto.id}
                  className={
                    repuesto.stockBajo
                      ? "bg-amber-50/60 dark:bg-amber-500/5"
                      : undefined
                  }
                >
                  <TableCell className={celda}>
                    <Link
                      href={`/inventario/${repuesto.id}`}
                      className="font-medium text-gray-800 hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400"
                    >
                      {repuesto.nombre}
                    </Link>
                  </TableCell>
                  <TableCell className={`${celda} whitespace-nowrap`}>
                    {repuesto.referencia}
                  </TableCell>
                  <TableCell className={celda}>
                    {repuesto.tipoEquipo.nombre}
                  </TableCell>
                  <TableCell className={celda}>
                    {repuesto.marcaCompatible}
                  </TableCell>
                  <TableCell className={`${celda} whitespace-nowrap`}>
                    <div className="flex items-center gap-2">
                      <span>
                        <span className="font-medium text-gray-800 dark:text-white/90">
                          {repuesto.cantidad}
                        </span>{" "}
                        / mín. {repuesto.cantidadMinima}
                      </span>
                      <BadgeStock
                        cantidad={repuesto.cantidad}
                        minimo={repuesto.cantidadMinima}
                      />
                    </div>
                  </TableCell>
                  <TableCell className={`${celda} whitespace-nowrap`}>
                    {formatearPesos(repuesto.precioVenta)}
                  </TableCell>
                  <TableCell className={`${celda} text-end`}>
                    <Link
                      href={`/inventario/${repuesto.id}`}
                      className="text-brand-500 hover:underline dark:text-brand-400"
                    >
                      Ver<span className="sr-only"> {repuesto.nombre}</span>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
