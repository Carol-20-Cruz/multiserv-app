// Reglas de bloqueo de cuenta — SWR-AUTH-004 y ajuste AJ-02.
// Funciones PURAS: no leen la base de datos ni el reloj; la hora "ahora"
// llega como parámetro. Así se pueden probar con caja blanca.

export const MAX_INTENTOS = 5;
export const MINUTOS_BLOQUEO = 10;

export interface EstadoBloqueo {
  intentosFallidos: number;
  bloqueadoHasta: Date | null;
}

export interface ResultadoIntentoFallido extends EstadoBloqueo {
  seBloqueo: boolean;
}

// ¿La cuenta sigue bloqueada en este momento?
export function estaBloqueada(
  bloqueadoHasta: Date | null,
  ahora: Date,
): boolean {
  return bloqueadoHasta !== null && bloqueadoHasta.getTime() > ahora.getTime();
}

// ¿Con esta cantidad de intentos fallidos consecutivos se debe bloquear?
export function debeBloquear(intentosFallidos: number): boolean {
  return intentosFallidos >= MAX_INTENTOS;
}

// Hasta cuándo dura el bloqueo que empieza "ahora".
export function calcularBloqueadoHasta(ahora: Date): Date {
  return new Date(ahora.getTime() + MINUTOS_BLOQUEO * 60_000);
}

// Nuevo estado de la cuenta después de una contraseña incorrecta.
// Si había un bloqueo que ya venció, el conteo empieza de nuevo desde 0.
export function registrarIntentoFallido(
  estado: EstadoBloqueo,
  ahora: Date,
): ResultadoIntentoFallido {
  const bloqueoVencido =
    estado.bloqueadoHasta !== null && !estaBloqueada(estado.bloqueadoHasta, ahora);
  const previos = bloqueoVencido ? 0 : estado.intentosFallidos;
  const intentosFallidos = previos + 1;

  if (debeBloquear(intentosFallidos)) {
    return {
      intentosFallidos,
      bloqueadoHasta: calcularBloqueadoHasta(ahora),
      seBloqueo: true,
    };
  }
  return { intentosFallidos, bloqueadoHasta: null, seBloqueo: false };
}

// AJ-02: tras un login correcto el contador vuelve a 0 y se quita el bloqueo.
export function reiniciarTrasLoginExitoso(): EstadoBloqueo {
  return { intentosFallidos: 0, bloqueadoHasta: null };
}
