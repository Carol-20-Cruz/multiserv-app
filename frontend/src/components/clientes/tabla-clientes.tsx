import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearTelefono } from "@/lib/telefono";
import type { ClienteListado } from "@/lib/tipos-clientes";
import Link from "next/link";

interface TablaClientesProps {
  clientes: ClienteListado[];
  buscando: boolean;
}

const celdaEncabezado =
  "px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";
const celda =
  "px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400";

// Tabla de la plantilla (basic-table) con los clientes de la página actual.
export default function TablaClientes({
  clientes,
  buscando,
}: TablaClientesProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader scope="col" className={celdaEncabezado}>
                Nombre
              </TableCell>
              <TableCell isHeader scope="col" className={celdaEncabezado}>
                Teléfono
              </TableCell>
              <TableCell isHeader scope="col" className={celdaEncabezado}>
                Barrio / ciudad
              </TableCell>
              <TableCell isHeader scope="col" className={celdaEncabezado}>
                Equipos
              </TableCell>
              <TableCell isHeader scope="col" className={celdaEncabezado}>
                <span className="sr-only">Acciones</span>
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {clientes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className={`${celda} text-center`}>
                  {buscando
                    ? "No se encontraron clientes con esa búsqueda."
                    : "Aún no hay clientes registrados."}
                </TableCell>
              </TableRow>
            ) : (
              clientes.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className={celda}>
                    <Link
                      href={`/clientes/${cliente.id}`}
                      className="font-medium text-gray-800 hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400"
                    >
                      {cliente.nombre}
                    </Link>
                  </TableCell>
                  <TableCell className={`${celda} whitespace-nowrap`}>
                    {formatearTelefono(cliente.telefono)}
                  </TableCell>
                  <TableCell className={celda}>
                    {[cliente.barrio, cliente.ciudad]
                      .filter(Boolean)
                      .join(", ")}
                  </TableCell>
                  <TableCell className={celda}>{cliente.equipos}</TableCell>
                  <TableCell className={`${celda} text-end`}>
                    <Link
                      href={`/clientes/${cliente.id}`}
                      className="text-brand-500 hover:underline dark:text-brand-400"
                    >
                      Ver<span className="sr-only"> a {cliente.nombre}</span>
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
