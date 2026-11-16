import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatearTelefono } from "@/lib/telefono";
import type { ClienteBasico } from "@/lib/tipos-clientes";
import Link from "next/link";

// SWR-CLI-004 + AJ-04: el teléfono ya existe -> se impide el registro y se
// muestra el cliente existente con un enlace a su ficha.
export default function AvisoDuplicado({
  cliente,
}: {
  cliente: ClienteBasico;
}) {
  return (
    <Alert variant="warning">
      <AlertTitle className="font-semibold text-gray-800 dark:text-white/90">
        Este teléfono ya está registrado
      </AlertTitle>
      <AlertDescription className="text-gray-700 dark:text-gray-300">
        <p>
          El teléfono {formatearTelefono(cliente.telefono)} pertenece a{" "}
          <strong>{cliente.nombre}</strong>
          {!cliente.activo && " (cliente desactivado)"}. No se puede registrar
          otro cliente con el mismo teléfono.
        </p>
        <Link
          href={`/clientes/${cliente.id}`}
          className="mt-1 inline-block font-medium text-brand-500 underline-offset-4 hover:underline dark:text-brand-400"
        >
          Ver cliente existente: {cliente.nombre}
        </Link>
      </AlertDescription>
    </Alert>
  );
}
