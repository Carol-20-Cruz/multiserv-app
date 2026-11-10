import { Badge, type BadgeProps } from "@/components/ui/badge";
import { ETIQUETA_ESTADO, type EstadoOrden } from "@/lib/tipos-ordenes";

// Un color por estado, para reconocerlo de un vistazo en la lista.
export const COLOR_ESTADO: Record<
  EstadoOrden,
  NonNullable<BadgeProps["color"]>
> = {
  RECIBIDO: "gray",
  EN_DIAGNOSTICO: "info",
  EN_REPARACION: "warning",
  LISTO_PARA_ENTREGA: "primary",
  ENTREGADO: "success",
};

// SWR-ORD-011: estado de la orden con su nombre legible.
export default function BadgeEstado({
  estado,
  size = "sm",
}: {
  estado: EstadoOrden;
  size?: BadgeProps["size"];
}) {
  return (
    <Badge variant="light" color={COLOR_ESTADO[estado]} size={size}>
      {ETIQUETA_ESTADO[estado]}
    </Badge>
  );
}
