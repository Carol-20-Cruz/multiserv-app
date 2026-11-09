import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearFecha } from "@/lib/fechas";
import type { Movimiento, TipoMovimiento } from "@/lib/tipos-inventario";

const celdaEncabezado =
  "px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";
const celda =
  "px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400";

const NOMBRE_TIPO: Record<TipoMovimiento, string> = {
  ENTRADA: "Entrada",
  SALIDA: "Salida",
  AJUSTE: "Ajuste",
};

// Historial del stock (últimos 20 movimientos).
export default function TablaMovimientos({
  movimientos,
}: {
  movimientos: Movimiento[];
}) {
  return (
    <div className="max-w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <Table>
        <caption className="sr-only">Movimientos del repuesto</caption>
        <TableHeader className="border-b border-gray-100 dark:border-gray-800">
          <TableRow>
            {[
              "Fecha",
              "Movimiento",
              "Cantidad",
              "Existencia después",
              "Proveedor / nota",
              "Registró",
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
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
          {movimientos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className={`${celda} text-center`}>
                Este repuesto aún no tiene movimientos.
              </TableCell>
            </TableRow>
          ) : (
            movimientos.map((m) => (
              <TableRow key={m.id}>
                <TableCell className={`${celda} whitespace-nowrap`}>
                  {formatearFecha(m.fecha)}
                </TableCell>
                <TableCell className={celda}>
                  <Badge
                    variant="light"
                    color={m.tipo === "ENTRADA" ? "success" : "gray"}
                    size="sm"
                  >
                    {NOMBRE_TIPO[m.tipo]}
                  </Badge>
                </TableCell>
                <TableCell
                  className={`${celda} font-medium text-gray-800 dark:text-white/90`}
                >
                  {m.tipo === "SALIDA" ? "−" : "+"}
                  {m.cantidad}
                </TableCell>
                <TableCell className={celda}>{m.saldoResultante}</TableCell>
                <TableCell className={celda}>
                  {[m.proveedor, m.motivo].filter(Boolean).join(" · ") || "—"}
                </TableCell>
                <TableCell className={celda}>{m.usuario.nombre}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
