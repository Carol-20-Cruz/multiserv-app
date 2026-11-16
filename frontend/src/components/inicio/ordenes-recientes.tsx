import BadgeEstado from "@/components/ordenes/badge-estado";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearPesos } from "@/lib/dinero";
import { formatearFecha } from "@/lib/fechas";
import type { OrdenReciente } from "@/lib/tipos-ordenes";
import Link from "next/link";

const celdaEncabezado =
  "px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";
const celda =
  "px-5 py-3.5 text-start text-theme-sm text-gray-600 dark:text-gray-400";

// Las 5 órdenes creadas más recientemente. La columna Saldo solo aparece
// para el Dueño (al Técnico el backend no le envía montos).
export default function OrdenesRecientes({
  ordenes,
  conSaldo,
}: {
  ordenes: OrdenReciente[];
  conSaldo: boolean;
}) {
  const titulos = ["Número", "Cliente", "Equipo", "Estado", "Recibida"];
  if (conSaldo) titulos.splice(4, 0, "Saldo");

  return (
    <section
      aria-labelledby="titulo-recientes"
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 pb-3 md:px-6">
        <h3
          id="titulo-recientes"
          className="text-base font-semibold text-gray-800 dark:text-white/90"
        >
          Órdenes recientes
        </h3>
        <Link
          href="/ordenes"
          className="text-theme-sm text-brand-500 hover:underline dark:text-brand-400"
        >
          Ver todas
        </Link>
      </div>
      <div className="max-w-full overflow-x-auto">
        <Table>
          <caption className="sr-only">Órdenes recientes</caption>
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              {titulos.map((t) => (
                <TableCell
                  key={t}
                  isHeader
                  scope="col"
                  className={celdaEncabezado}
                >
                  {t}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {ordenes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={titulos.length}
                  className={`${celda} text-center`}
                >
                  Aún no hay órdenes registradas.
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
                    {orden.cliente.nombre}
                  </TableCell>
                  <TableCell className={celda}>
                    {orden.equipo.tipoEquipo.nombre} {orden.equipo.marca}
                  </TableCell>
                  <TableCell className={celda}>
                    <BadgeEstado estado={orden.estado} />
                  </TableCell>
                  {conSaldo && (
                    <TableCell className={`${celda} whitespace-nowrap`}>
                      {orden.saldo === null || orden.saldo === undefined
                        ? "—"
                        : formatearPesos(orden.saldo)}
                    </TableCell>
                  )}
                  <TableCell className={`${celda} whitespace-nowrap`}>
                    {formatearFecha(orden.creadoEn)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
