// Fechas en formato colombiano y hora de Colombia (Neiva).
const formato = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

export function formatearFecha(iso: string | null): string {
  return iso ? formato.format(new Date(iso)) : "—";
}

// Campo <input type="datetime-local"> ("2026-11-10T14:30") <-> ISO.
// Colombia no cambia de horario: siempre UTC-5. Así la hora escrita es la
// de Neiva aunque el navegador tenga otra zona horaria.
const formatoCampo = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function isoACampoFechaHora(iso: string | null): string {
  return iso ? formatoCampo.format(new Date(iso)).replace(" ", "T") : "";
}

export function campoFechaHoraAIso(valor: string): string | null {
  if (!valor) return null;
  const fecha = new Date(`${valor}:00-05:00`);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}
