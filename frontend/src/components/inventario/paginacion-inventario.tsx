import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { urlInventario, type FiltrosActuales } from "./url-inventario";

interface PaginacionInventarioProps {
  pagina: number;
  totalPaginas: number;
  filtros: FiltrosActuales;
}

// Paginación de la plantilla con enlaces que conservan los filtros.
export default function PaginacionInventario({
  pagina,
  totalPaginas,
  filtros,
}: PaginacionInventarioProps) {
  if (totalPaginas <= 1) return null;

  return (
    <Pagination aria-label="Páginas de repuestos">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={urlInventario(filtros, pagina - 1)}
            disabled={pagina <= 1}
            aria-label="Página anterior"
            text="Anterior"
          />
        </PaginationItem>
        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
          <PaginationItem key={n}>
            <PaginationLink
              href={urlInventario(filtros, n)}
              isActive={n === pagina}
              aria-label={`Página ${n}`}
            >
              {n}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href={urlInventario(filtros, pagina + 1)}
            disabled={pagina >= totalPaginas}
            aria-label="Página siguiente"
            text="Siguiente"
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
