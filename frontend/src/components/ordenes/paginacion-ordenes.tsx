import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { urlOrdenes, type FiltrosOrdenes } from "./url-ordenes";

interface PaginacionOrdenesProps {
  pagina: number;
  totalPaginas: number;
  filtros: FiltrosOrdenes;
}

// Paginación de la plantilla con enlaces que conservan los filtros.
export default function PaginacionOrdenes({
  pagina,
  totalPaginas,
  filtros,
}: PaginacionOrdenesProps) {
  if (totalPaginas <= 1) return null;

  return (
    <Pagination aria-label="Páginas de órdenes">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={urlOrdenes(filtros, pagina - 1)}
            disabled={pagina <= 1}
            aria-label="Página anterior"
            text="Anterior"
          />
        </PaginationItem>
        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
          <PaginationItem key={n}>
            <PaginationLink
              href={urlOrdenes(filtros, n)}
              isActive={n === pagina}
              aria-label={`Página ${n}`}
            >
              {n}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href={urlOrdenes(filtros, pagina + 1)}
            disabled={pagina >= totalPaginas}
            aria-label="Página siguiente"
            text="Siguiente"
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
