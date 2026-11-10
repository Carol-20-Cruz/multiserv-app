import {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from "@/components/ui/progress-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearPesos } from "@/lib/dinero";
import { formatearFecha } from "@/lib/fechas";
import {
  ETIQUETA_MEDIO,
  ETIQUETA_TIPO_PAGO,
  type OrdenDetalle,
} from "@/lib/tipos-ordenes";
import RegistrarPago from "./registrar-pago";

type CuentaOrdenProps = Pick<
  OrdenDetalle,
  | "id"
  | "estado"
  | "valorCotizado"
  | "totalPagado"
  | "saldo"
  | "abonoMinimo"
  | "pagos"
>;

const celdaEncabezado =
  "px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";
const celda =
  "px-4 py-3 text-start text-theme-sm text-gray-600 dark:text-gray-400";

// SWR-PAY-004: total cotizado, lo pagado, el saldo y la lista de pagos.
// Los montos los calcula el backend con sus reglas puras.
export default function CuentaOrden({
  id,
  estado,
  valorCotizado,
  totalPagado,
  saldo,
  abonoMinimo,
  pagos,
}: CuentaOrdenProps) {
  if (valorCotizado === null || saldo === null) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Aún no hay cotización aprobada: los pagos se registran después de
        cotizar.
      </p>
    );
  }

  const porcentaje = Math.min(
    100,
    Math.round((totalPagado / valorCotizado) * 100),
  );
  const cifras: [string, string, string][] = [
    [
      "Total",
      formatearPesos(valorCotizado),
      "text-gray-800 dark:text-white/90",
    ],
    [
      "Pagado",
      formatearPesos(totalPagado),
      "text-green-600 dark:text-green-500",
    ],
    [
      "Saldo",
      formatearPesos(saldo),
      saldo > 0
        ? "text-amber-600 dark:text-amber-400"
        : "text-green-600 dark:text-green-500",
    ],
  ];

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-3 gap-4">
        {cifras.map(([etiqueta, valor, color]) => (
          <div key={etiqueta}>
            <dt className="mb-1 text-xs text-gray-500 dark:text-gray-400">
              {etiqueta}
            </dt>
            <dd className={`text-base font-semibold sm:text-lg ${color}`}>
              {valor}
            </dd>
          </div>
        ))}
      </dl>

      <Progress value={porcentaje}>
        <ProgressLabel>Pagado</ProgressLabel>
        <ProgressValue>{() => `${porcentaje} %`}</ProgressValue>
        <ProgressTrack className="basis-full">
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <caption className="sr-only">Pagos de la orden</caption>
            <TableHeader className="border-b border-gray-100 dark:border-gray-800">
              <TableRow>
                {["Fecha", "Tipo", "Medio", "Valor", "Registró"].map((t) => (
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
              {pagos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className={`${celda} text-center`}>
                    Aún no hay pagos registrados.
                  </TableCell>
                </TableRow>
              ) : (
                pagos.map((pago) => (
                  <TableRow key={pago.id}>
                    <TableCell className={`${celda} whitespace-nowrap`}>
                      {formatearFecha(pago.fecha)}
                    </TableCell>
                    <TableCell className={celda}>
                      {ETIQUETA_TIPO_PAGO[pago.tipo]}
                    </TableCell>
                    <TableCell className={celda}>
                      {ETIQUETA_MEDIO[pago.medio]}
                      {pago.referencia && (
                        <span className="text-theme-xs block">
                          Ref. {pago.referencia}
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className={`${celda} font-medium whitespace-nowrap text-gray-800 dark:text-white/90`}
                    >
                      {formatearPesos(pago.valor)}
                    </TableCell>
                    <TableCell className={celda}>
                      {pago.usuario.nombre}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {estado !== "ENTREGADO" && saldo > 0 && (
        <RegistrarPago
          ordenId={id}
          saldo={saldo}
          abonoMinimo={abonoMinimo}
          totalPagado={totalPagado}
        />
      )}
    </div>
  );
}
