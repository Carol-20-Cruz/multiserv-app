import { BoxIcon } from "@/icons";
import Link from "next/link";

// SWR-INV-009: tarjeta del Inicio, solo para el Dueño, con el número de
// repuestos en existencia baja y enlace a la lista filtrada.
export default function TarjetaStockBajo({ total }: { total: number }) {
  const hayAlerta = total > 0;

  return (
    <Link
      href="/inventario?soloStockBajo=1"
      className={
        hayAlerta
          ? "group block rounded-2xl border border-amber-300 bg-amber-50 p-5 transition-colors hover:border-amber-400 md:p-6 dark:border-amber-500/40 dark:bg-amber-500/10"
          : "group block rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-brand-200 md:p-6 dark:border-gray-800 dark:bg-white/3"
      }
    >
      <div className="flex items-center gap-4">
        <div
          className={
            hayAlerta
              ? "flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300"
              : "flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400"
          }
        >
          <BoxIcon className="size-6" />
        </div>
        <div>
          <p className="text-title-sm font-semibold text-gray-800 dark:text-white/90">
            {total === 1
              ? "1 repuesto con existencia baja"
              : `${total} repuestos con existencia baja`}
          </p>
          <p className="text-sm text-gray-600 group-hover:underline dark:text-gray-400">
            {hayAlerta ? "Ver repuestos por agotarse" : "Ver inventario"}
          </p>
        </div>
      </div>
    </Link>
  );
}
