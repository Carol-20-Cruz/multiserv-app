"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface MensajeExitoProps {
  // Mensaje que llega por la URL (?registrado=1, ?actualizado=1, ?entrada=1...):
  // - texto: mostrarlo (reemplaza al anterior);
  // - "" (vacío): hubo otra acción con su propio aviso; se borra el anterior;
  // - null: la URL no trae aviso; se conserva lo que ya se mostraba.
  mensaje: string | null;
  // false si el cliente o repuesto está desactivado: ya no tiene sentido felicitar.
  visible: boolean;
}

// Muestra cada mensaje de éxito UNA sola vez y siempre el ÚLTIMO:
// 1. guarda el texto en su propio estado al aparecer;
// 2. quita el parámetro de la URL con router.replace (así, si se recarga la
//    página o se desactiva, el mensaje no vuelve a salir).
// El componente sigue en el mismo lugar de la página, por eso React conserva
// su estado aunque la página se vuelva a dibujar sin el parámetro. Por lo
// mismo, cuando una acción en la MISMA página trae un aviso nuevo (registrar
// una entrada, agregar un equipo), hay que reemplazar el texto guardado; si
// no, seguiría saliendo el aviso viejo ("... registrado correctamente.").
export default function MensajeExito({ mensaje, visible }: MensajeExitoProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [texto, setTexto] = useState(mensaje);

  // Ajustar el estado cuando cambia la prop (patrón recomendado por React:
  // durante el render, sin un efecto extra).
  if (mensaje !== null && mensaje !== texto) {
    setTexto(mensaje);
  }

  useEffect(() => {
    if (mensaje !== null) router.replace(pathname, { scroll: false });
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
