import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PaginacionClientesProps {
  pagina: number;
  totalPaginas: number;
  buscar: string;
}

// Paginación de la plantilla con enlaces normales (/clientes?pagina=N).
export default function PaginacionClientes({
  pagina,
  totalPaginas,
  buscar,
}: PaginacionClientesProps) {
  if (totalPaginas <= 1) return null;

  const enlace = (n: number) => {
    const params = new URLSearchParams();
    if (buscar) params.set("buscar", buscar);
    params.set("pagina", String(n));
    return `/clientes?${params.toString()}`;
  };

  return (
    <Pagination aria-label="Páginas de clientes">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={enlace(pagina - 1)}
            disabled={pagina <= 1}
            aria-label="Página anterior"
            text="Anterior"
          />
        </PaginationItem>
        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
          <PaginationItem key={n}>
            <PaginationLink
              href={enlace(n)}
              isActive={n === pagina}
              aria-label={`Página ${n}`}
            >
              {n}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href={enlace(pagina + 1)}
            disabled={pagina >= totalPaginas}
            aria-label="Página siguiente"
            text="Siguiente"
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
