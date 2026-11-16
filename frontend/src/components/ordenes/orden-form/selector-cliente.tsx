"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  mensajeDeError,
  MENSAJE_SIN_CONEXION,
  pedirApi,
} from "@/lib/api-navegador";
import { formatearTelefono } from "@/lib/telefono";
import type {
  ClienteDetalle,
  ClienteListado,
  PaginaClientes,
} from "@/lib/tipos-clientes";
import { useState } from "react";

interface SelectorClienteProps {
  cliente: ClienteDetalle | null;
  onSeleccionar: (cliente: ClienteDetalle | null) => void;
  invalido: boolean;
  // id del campo de búsqueda (la etiqueta del formulario apunta a él).
  id: string;
}

// Paso 1 de la orden nueva: buscar el cliente (nombre o teléfono) y
// elegirlo. Al elegirlo se piden sus equipos para el paso 2.
// (No es un <form>: vive dentro del formulario de la orden.)
export default function SelectorCliente({
  cliente,
  onSeleccionar,
  invalido,
  id,
}: SelectorClienteProps) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<ClienteListado[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buscar = async () => {
    const consulta = texto.trim();
    if (!consulta) return;
    setError(null);
    setCargando(true);
    try {
      const res = await pedirApi<PaginaClientes>(
        `/api/clientes?buscar=${encodeURIComponent(consulta)}`,
      );
      if (!res.ok) {
        setError(mensajeDeError(res.cuerpo, "No se pudo buscar el cliente"));
        return;
      }
      setResultados(res.cuerpo.datos);
    } catch {
      setError(MENSAJE_SIN_CONEXION);
    } finally {
      setCargando(false);
    }
  };

  const elegir = async (clienteId: number) => {
    setError(null);
    setCargando(true);
    try {
      const res = await pedirApi<ClienteDetalle>(`/api/clientes/${clienteId}`);
      if (!res.ok) {
        setError(mensajeDeError(res.cuerpo, "No se pudo cargar el cliente"));
        return;
      }
      setResultados(null);
      setTexto("");
      onSeleccionar(res.cuerpo);
    } catch {
      setError(MENSAJE_SIN_CONEXION);
    } finally {
      setCargando(false);
    }
  };

  if (cliente) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-gray-200 px-4 py-3 dark:border-gray-800">
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {cliente.nombre}
          </p>
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            {formatearTelefono(cliente.telefono)} · {cliente.equipos.length}{" "}
            equipo(s)
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSeleccionar(null)}
        >
          Cambiar cliente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          id={id}
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            // Enter busca el cliente en vez de enviar la orden.
            if (e.key === "Enter") {
              e.preventDefault();
              void buscar();
            }
          }}
          placeholder="Nombre o teléfono del cliente"
          maxLength={100}
          aria-invalid={invalido ? "true" : undefined}
          aria-required="true"
        />
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => void buscar()}
          disabled={cargando}
        >
          Buscar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-red-700 dark:text-red-300">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {resultados !== null &&
        (resultados.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No hay clientes activos con ese nombre o teléfono.
          </p>
        ) : (
          <ul
            aria-label="Clientes encontrados"
            className="divide-y divide-gray-100 rounded-[10px] border border-gray-200 dark:divide-gray-800 dark:border-gray-800"
          >
            {resultados.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => void elegir(c.id)}
                  disabled={cargando}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start text-sm hover:bg-gray-50 dark:hover:bg-white/3"
                >
                  <span className="font-medium text-gray-800 dark:text-white/90">
                    {c.nombre}
                  </span>
                  <span className="text-theme-xs whitespace-nowrap text-gray-500 dark:text-gray-400">
                    {formatearTelefono(c.telefono)} · {c.equipos} equipo(s)
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
