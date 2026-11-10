"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ETIQUETA_ESTADO,
  esEstadoOrden,
  SECUENCIA_ESTADOS,
} from "@/lib/tipos-ordenes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { urlOrdenes, type FiltrosOrdenes } from "./url-ordenes";

const TODOS = "todos";

// Buscar por número de orden, nombre o teléfono del cliente y filtrar por
// estado. Los filtros viajan en la URL: se pueden recargar o compartir.
export default function FiltrosOrdenes({
  filtros,
}: {
  filtros: FiltrosOrdenes;
}) {
  const router = useRouter();
  const [buscar, setBuscar] = useState(filtros.buscar);
  const [estado, setEstado] = useState(filtros.estado);
  const hayFiltros = Boolean(filtros.buscar || filtros.estado);

  const aplicar = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(urlOrdenes({ buscar: buscar.trim(), estado }));
  };

  return (
    <form
      role="search"
      onSubmit={aplicar}
      className="flex w-full min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-end"
    >
      {/* min-w: sin él, el campo se encoge hasta partir la etiqueta. */}
      <Field controlId="buscar" className="flex-1 lg:min-w-72">
        <FieldLabel>Buscar por número, cliente o teléfono</FieldLabel>
        <Input
          type="search"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Ej.: MS-2026-00001 o María"
          maxLength={100}
        />
      </Field>

      <Field controlId="estadoFiltro" className="shrink-0 lg:w-56">
        <FieldLabel>Estado</FieldLabel>
        <Select
          value={estado || TODOS}
          onValueChange={(valor) => {
            const texto = String(valor ?? "");
            setEstado(esEstadoOrden(texto) ? texto : "");
          }}
        >
          <SelectTrigger id="estadoFiltro">
            <SelectValue>
              {(valor: string | null) =>
                valor && esEstadoOrden(valor) ? ETIQUETA_ESTADO[valor] : "Todos"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos</SelectItem>
            {SECUENCIA_ESTADOS.map((e) => (
              <SelectItem key={e} value={e}>
                {ETIQUETA_ESTADO[e]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="flex gap-2">
        <Button type="submit" variant="outline" size="lg">
          Filtrar
        </Button>
        {hayFiltros && (
          <Link
            href="/ordenes"
            className="inline-flex h-11 items-center px-3 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90"
          >
            Limpiar
          </Link>
        )}
      </div>
    </form>
  );
}
