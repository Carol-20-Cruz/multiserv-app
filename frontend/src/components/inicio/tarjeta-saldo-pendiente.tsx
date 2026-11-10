import { formatearPesos } from "@/lib/dinero";

// SWR-PAY-004: lo que falta por cobrar en las órdenes no entregadas.
// Solo para el Dueño (el backend no le envía este dato al Técnico).
export default function TarjetaSaldoPendiente({ total }: { total: number }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 md:p-6 dark:border-gray-800 dark:bg-white/3">
      <div
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-green-50 text-xl font-bold text-green-600 dark:bg-green-500/15 dark:text-green-500"
      >
        $
      </div>
      <div>
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          Saldo pendiente por cobrar
        </p>
        <p className="text-title-sm font-bold text-gray-800 tabular-nums dark:text-white/90">
          {formatearPesos(total)}
        </p>
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          Órdenes aún no entregadas
        </p>
      </div>
    </div>
  );
}
