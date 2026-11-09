// Pesos colombianos sin decimales (SWR-CON-003): 180000 -> "$ 180.000".
const formato = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatearPesos(valor: number): string {
  return formato.format(valor);
}

// Lo que escribe la persona en un campo de pesos o cantidades: se aceptan
// puntos y espacios de miles ("180.000"), que se quitan. Una coma (decimal)
// o letras dejan el valor como inválido.
export function limpiarEntero(valor: string): string {
  return valor.replace(/[.\s]/g, "");
}

export const esEnteroTexto = (valor: string) =>
  /^\d+$/.test(limpiarEntero(valor));
