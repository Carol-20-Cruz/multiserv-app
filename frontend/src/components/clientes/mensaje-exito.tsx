"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface MensajeExitoProps {
  // Mensaje que llega por la URL (?registrado=1 o ?actualizado=1), o null.
  mensaje: string | null;
  // false si el cliente está desactivado: ya no tiene sentido felicitar.
  visible: boolean;
}

// Muestra el mensaje de éxito UNA sola vez:
// 1. guarda el texto en su propio estado al aparecer;
// 2. quita el parámetro de la URL con router.replace (así, si se recarga la
//    página o se desactiva el cliente, el mensaje no vuelve a salir).
// El componente sigue en el mismo lugar de la página, por eso React conserva
// su estado aunque la página se vuelva a dibujar sin el parámetro.
export default function MensajeExito({ mensaje, visible }: MensajeExitoProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [texto] = useState(mensaje);

  useEffect(() => {
    if (mensaje) router.replace(pathname, { scroll: false });
  }, [mensaje, pathname, router]);

  if (!texto || !visible) return null;

  return (
    <Alert variant="success" role="status">
      <AlertDescription className="text-green-700 dark:text-green-300">
        {texto}
      </AlertDescription>
    </Alert>
  );
}
