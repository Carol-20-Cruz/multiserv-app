import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

interface AlertaStockBajoProps {
  // Repuestos activos con cantidad <= mínimo.
  total: number;
  // true si la lista ya está filtrada por stock bajo.
  filtrando: boolean;
}

// SWR-INV-009: aviso en /inventario cuando hay repuestos por agotarse.
export default function AlertaStockBajo({
  total,
  filtrando,
}: AlertaStockBajoProps) {
  if (total === 0) return null;

  return (
    <Alert variant="warning" role="alert">
      <AlertTitle className="text-amber-800 dark:text-amber-300">
        {total === 1
          ? "1 repuesto con existencia baja"
          : `${total} repuestos con existencia baja`}
      </AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-x-3 text-amber-700 dark:text-amber-200">
        Su cantidad llegó o bajó del mínimo. Registra una entrada cuando lleguen
        del proveedor.
        {filtrando ? (
          <Link
            href="/inventario"
            className="font-medium underline underline-offset-2"
          >
            Ver todos
          </Link>
        ) : (
          <Link
            href="/inventario?soloStockBajo=1"
            className="font-medium underline underline-offset-2"
          >
            Ver solo stock bajo
          </Link>
        )}
      </AlertDescription>
    </Alert>
  );
}
