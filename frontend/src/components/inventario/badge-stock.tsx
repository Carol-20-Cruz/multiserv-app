import { Badge } from "@/components/ui/badge";
import { esStockBajo } from "@/lib/stock";

interface BadgeStockProps {
  cantidad: number;
  minimo: number;
}

// SWR-INV-009: indicador en la fila. Solo aparece si el stock llegó o bajó
// del mínimo; "Agotado" cuando ya no queda ninguno.
export default function BadgeStock({ cantidad, minimo }: BadgeStockProps) {
  if (!esStockBajo(cantidad, minimo)) return null;

  return (
    <Badge
      variant="light"
      color={cantidad === 0 ? "error" : "warning"}
      size="sm"
    >
      {cantidad === 0 ? "Agotado" : "Stock bajo"}
    </Badge>
  );
}
