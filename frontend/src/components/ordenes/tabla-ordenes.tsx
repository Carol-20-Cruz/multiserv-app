import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearPesos } from "@/lib/dinero";
import { formatearFecha } from "@/lib/fechas";
import { formatearTelefono } from "@/lib/telefono";
import type { OrdenListado } from "@/lib/tipos-ordenes";
import Link from "next/link";
import BadgeEstado from "./badge-estado";

interface TablaOrdenesProps {
  ordenes: OrdenListado[];
  filtrando: boolean;
}

const celdaEncabezado =
  "px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";
const celda =
  "px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400";

// Órdenes de la página, las más nuevas primero.
export default function TablaOrdenes({
  ordenes,
  filtrando,
}: TablaOrdenesProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="max-w-full overflow-x-auto">
        <Table>
          <caption className="sr-only">Órdenes de servicio</caption>
          <TableHeader className="border-b border-gray-100 dark:border-gray-800">
            <TableRow>
              {[
                "Número",
                "Cliente",
                "Equipo",
                "Estado",
                "Responsable",
                "Cotizado",
                "Recibida",
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
            {ordenes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className={`${celda} text-center`}>
                  {filtrando
                    ? "No hay órdenes con esos filtros."
                    : "Aún no hay órdenes registradas."}
                </TableCell>
              </TableRow>
            ) : (
              ordenes.map((orden) => (
                <TableRow key={orden.id}>
                  <TableCell className={`${celda} whitespace-nowrap`}>
                    <Link
                      href={`/ordenes/${orden.id}`}
                      className="font-medium text-gray-800 hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400"
                    >
                      {orden.numero}
                    </Link>
                  </TableCell>
                  <TableCell className={celda}>
                    <span className="block text-gray-800 dark:text-white/90">
                      {orden.cliente.nombre}
                    </span>
                    <span className="text-theme-xs whitespace-nowrap">
                      {formatearTelefono(orden.cliente.telefono)}
                    </span>
                  </TableCell>
                  <TableCell className={celda}>
                    {orden.equipo.tipoEquipo.nombre} {orden.equipo.marca}
                  </TableCell>
                  <TableCell className={celda}>
                    <BadgeEstado estado={orden.estado} />
                  </TableCell>
                  <TableCell className={celda}>
                    {orden.responsable.nombre}
                  </TableCell>
                  <TableCell className={`${celda} whitespace-nowrap`}>
                    {orden.valorCotizado === null
                      ? "—"
                      : formatearPesos(orden.valorCotizado)}
                  </TableCell>
                  <TableCell className={`${celda} whitespace-nowrap`}>
                    {formatearFecha(orden.creadoEn)}
                  </TableCell>
                  <TableCell className={`${celda} text-end`}>
                    <Link
                      href={`/ordenes/${orden.id}`}
                      className="text-brand-500 hover:underline dark:text-brand-400"
                    >
                      Ver<span className="sr-only"> orden {orden.numero}</span>
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
