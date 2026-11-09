"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TipoEquipo } from "@/lib/tipos-clientes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { urlInventario, type FiltrosActuales } from "./url-inventario";

interface FiltrosInventarioProps {
  filtros: FiltrosActuales;
  tipos: TipoEquipo[];
}

const TODOS = "todos";

// Buscar por nombre o referencia, filtrar por tipo de equipo y por stock
// bajo. Los filtros viajan en la URL: se pueden recargar o compartir.
export default function FiltrosInventario({
  filtros,
  tipos,
}: FiltrosInventarioProps) {
  const router = useRouter();
  const [buscar, setBuscar] = useState(filtros.buscar);
  const [tipoEquipoId, setTipoEquipoId] = useState(filtros.tipoEquipoId);
  const [soloStockBajo, setSoloStockBajo] = useState(filtros.soloStockBajo);
  const nombrePorId = Object.fromEntries(
    tipos.map((t) => [String(t.id), t.nombre]),
  );
  const hayFiltros =
    filtros.buscar || filtros.tipoEquipoId || filtros.soloStockBajo;

  const aplicar = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(
      urlInventario({ buscar: buscar.trim(), tipoEquipoId, soloStockBajo }),
    );
  };

  return (
    <form
      role="search"
      onSubmit={aplicar}
      className="flex w-full min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-end"
    >
      {/* min-w: sin él, el campo se encoge hasta partir la etiqueta. */}
      <Field controlId="buscar" className="flex-1 lg:min-w-72">
        <FieldLabel>Buscar por nombre o referencia</FieldLabel>
        <Input
          type="search"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Ej.: compresor o BN44"
          maxLength={100}
        />
      </Field>

      <Field controlId="tipoEquipoFiltro" className="shrink-0 lg:w-56">
        <FieldLabel>Tipo de equipo</FieldLabel>
        <Select
          value={tipoEquipoId || TODOS}
          onValueChange={(valor) =>
            setTipoEquipoId(!valor || valor === TODOS ? "" : String(valor))
          }
        >
          <SelectTrigger id="tipoEquipoFiltro">
            <SelectValue>
              {(valor: string | null) =>
                valor && valor !== TODOS ? nombrePorId[valor] : "Todos"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos</SelectItem>
            {tipos.map((tipo) => (
              <SelectItem key={tipo.id} value={String(tipo.id)}>
                {tipo.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        orientation="horizontal"
        controlId="soloStockBajo"
        className="w-auto shrink-0 items-center whitespace-nowrap lg:h-11"
      >
        <Checkbox
          checked={soloStockBajo}
          onCheckedChange={(marcado) => setSoloStockBajo(marcado === true)}
        />
        <FieldLabel>Solo stock bajo</FieldLabel>
      </Field>

      <div className="flex gap-2">
        <Button type="submit" variant="outline" size="lg">
          Filtrar
        </Button>
        {hayFiltros && (
          <Link
            href="/inventario"
            className="inline-flex h-11 items-center px-3 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90"
          >
            Limpiar
          </Link>
        )}
      </div>
    </form>
  );
}
