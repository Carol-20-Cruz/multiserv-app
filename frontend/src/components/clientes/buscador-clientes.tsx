"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface BuscadorClientesProps {
  buscar: string;
}

// Buscar clientes por nombre o teléfono. Es un formulario GET normal:
// el texto viaja en la URL (/clientes?buscar=...), así la búsqueda se puede
// recargar o compartir y funciona aunque falle el JavaScript.
export default function BuscadorClientes({ buscar }: BuscadorClientesProps) {
  return (
    <form
      role="search"
      action="/clientes"
      method="get"
      className="flex w-full flex-col gap-3 sm:flex-row sm:items-end"
    >
      <Field controlId="buscar" className="flex-1">
        <FieldLabel>Buscar por nombre o teléfono</FieldLabel>
        <Input
          name="buscar"
          type="search"
          defaultValue={buscar}
          placeholder="Ej.: María o 300 123 4567"
          maxLength={100}
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" variant="outline" size="lg">
          Buscar
        </Button>
        {buscar && (
          <Link
            href="/clientes"
            className="inline-flex h-11 items-center px-3 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90"
          >
            Limpiar
          </Link>
        )}
      </div>
    </form>
  );
}
