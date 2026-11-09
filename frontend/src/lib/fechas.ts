// Fechas en formato colombiano y hora de Colombia (Neiva).
const formato = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

export function formatearFecha(iso: string | null): string {
  return iso ? formato.format(new Date(iso)) : "—";
}
