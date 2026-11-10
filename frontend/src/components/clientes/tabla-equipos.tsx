import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearFecha } from "@/lib/fechas";
import type { Equipo } from "@/lib/tipos-clientes";
import Link from "next/link";

const celdaEncabezado =
  "px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";
const celda =
  "px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400";

interface TablaEquiposProps {
  equipos: Equipo[];
  // Solo si el cliente está activo: cada fila lleva "Nueva orden"
  // (SWR-ORD-001), que abre el formulario con el cliente y el equipo.
  clienteId?: number;
}

// Equipos activos del cliente (SWR-EQP-003).
export default function TablaEquipos({
  equipos,
  clienteId,
}: TablaEquiposProps) {
  const columnas = clienteId === undefined ? 5 : 6;
  return (
    <div className="max-w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <Table>
        <caption className="sr-only">Equipos del cliente</caption>
        <TableHeader className="border-b border-gray-100 dark:border-gray-800">
          <TableRow>
            {["Tipo", "Marca", "Referencia", "Serial", "Registrado"].map(
              (titulo) => (
                <TableCell
                  key={titulo}
                  isHeader
                  scope="col"
                  className={celdaEncabezado}
                >
                  {titulo}
                </TableCell>
              ),
            )}
            {clienteId !== undefined && (
              <TableCell isHeader scope="col" className={celdaEncabezado}>
                <span className="sr-only">Acciones</span>
              </TableCell>
            )}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
          {equipos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columnas} className={`${celda} text-center`}>
                Este cliente aún no tiene equipos registrados.
              </TableCell>
            </TableRow>
          ) : (
            equipos.map((equipo) => (
              <TableRow key={equipo.id}>
                <TableCell
                  className={`${celda} font-medium text-gray-800 dark:text-white/90`}
                >
                  {equipo.tipoEquipo.nombre}
                </TableCell>
                <TableCell className={celda}>{equipo.marca}</TableCell>
                <TableCell className={celda}>
                  {equipo.referencia ?? "—"}
                </TableCell>
                <TableCell className={celda}>{equipo.serial ?? "—"}</TableCell>
                <TableCell className={`${celda} whitespace-nowrap`}>
                  {formatearFecha(equipo.creadoEn)}
                </TableCell>
                {clienteId !== undefined && (
                  <TableCell className={`${celda} text-end`}>
                    <Link
                      href={`/ordenes/nueva?clienteId=${clienteId}&equipoId=${equipo.id}`}
                      className="whitespace-nowrap text-brand-500 hover:underline dark:text-brand-400"
                    >
                      Nueva orden
                      <span className="sr-only">
                        {" "}
                        para {equipo.tipoEquipo.nombre} {equipo.marca}
                      </span>
                    </Link>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
