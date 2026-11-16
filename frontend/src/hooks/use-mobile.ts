"use client";

import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 1280; // xl breakpoint — matches TailAdmin sidebar's xl:translate-x-0
const CONSULTA = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function suscribir(avisar: () => void) {
  const mql = window.matchMedia(CONSULTA);
  mql.addEventListener("change", avisar);
  return () => mql.removeEventListener("change", avisar);
}

// useSyncExternalStore en vez de setState dentro de un efecto: en el servidor
// devuelve false (como antes) y en el navegador el valor real del media query.
export function useIsMobile() {
  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia(CONSULTA).matches,
    () => false,
  );
}
