import {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
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

// px-3 (no px-4): las cinco columnas caben en la tarjeta de media pantalla
// sin scroll horizontal; el scroll queda solo como respaldo en pantallas
// angostas.
const celdaEncabezado =
  "px-3 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";
const celda =
  "px-3 py-3 text-start text-theme-sm text-gray-600 dark:text-gray-400";

// "10/11/2026, 10:29 a. m." -> día y hora en dos líneas, cada una sin partir.
function partesFecha(iso: string): [string, string] {
  const texto = formatearFecha(iso);
  const i = texto.indexOf(", ");
  return i === -1 ? [texto, ""] : [texto.slice(0, i), texto.slice(i + 2)];
}

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
        {/* Defecto 9: este archivo es un Server Component y las props hacia
            un componente cliente deben ser serializables. ProgressValue
            solo acepta una FUNCIÓN como hijo, así que el porcentaje va ya
            calculado en un span normal (la barra conserva aria-valuenow). */}
        <span className="ms-auto text-sm font-medium text-gray-500 tabular-nums dark:text-gray-400">
          {porcentaje} %
        </span>
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
                pagos.map((pago) => {
                  const [dia, hora] = partesFecha(pago.fecha);
                  return (
                    <TableRow key={pago.id}>
                      <TableCell className={celda}>
                        <span className="block whitespace-nowrap">{dia}</span>
                        {hora && (
                          <span className="text-theme-xs block whitespace-nowrap">
                            {hora}
                          </span>
                        )}
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
                  );
                })
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
