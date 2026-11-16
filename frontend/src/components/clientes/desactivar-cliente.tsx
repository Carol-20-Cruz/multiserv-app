"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  mensajeDeError,
  MENSAJE_SIN_CONEXION,
  pedirApi,
} from "@/lib/api-navegador";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface DesactivarClienteProps {
  clienteId: number;
  nombre: string;
}

// SWR-DATA-005: desactivar SIN borrar, con confirmación.
export default function DesactivarCliente({
  clienteId,
  nombre,
}: DesactivarClienteProps) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const desactivar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const res = await pedirApi(
        `/api/clientes/${clienteId}/desactivar`,
        "PATCH",
      );
      if (!res.ok) {
        setError(
          mensajeDeError(res.cuerpo, "No se pudo desactivar el cliente"),
        );
        return;
      }
      setAbierto(false);
      router.refresh();
    } catch {
      setError(MENSAJE_SIN_CONEXION);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button variant="outline" size="lg" />}>
        Desactivar cliente
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Desactivar a {nombre}?</DialogTitle>
          <DialogDescription>
            El cliente dejará de aparecer en el listado y no se le podrán
            agregar equipos. Sus datos y su historial no se borran.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="text-red-700 dark:text-red-300">
              {error}
            </AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancelar
          </DialogClose>
          <Button
            variant="destructive"
            onClick={desactivar}
            disabled={enviando}
          >
            {enviando ? "Desactivando..." : "Sí, desactivar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
