// Datos de prueba únicos por corrida. Todo es ficticio y lleva el prefijo
// "E2E" para reconocerlo en la base (no se borra al terminar).

const dosDigitos = (n: number) => String(n).padStart(2, "0");

// "20261114-203015-k3f9": fecha y hora local + 4 caracteres al azar.
export function sufijoUnico(): string {
  const d = new Date();
  const fecha = `${d.getFullYear()}${dosDigitos(d.getMonth() + 1)}${dosDigitos(d.getDate())}`;
  const hora = `${dosDigitos(d.getHours())}${dosDigitos(d.getMinutes())}${dosDigitos(d.getSeconds())}`;
  const azar = Math.random().toString(36).slice(2, 6).padEnd(4, "0");
  return `${fecha}-${hora}-${azar}`;
}

// Teléfono ficticio de 10 dígitos que empieza por 3 (SWR-CLI-003). Los
// milisegundos + 3 dígitos al azar evitan el aviso de teléfono duplicado
// (AJ-04) entre pruebas y corridas.
export function telefonoUnico(): string {
  const ms = String(Date.now()).slice(-6);
  const azar = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `3${ms}${azar}`;
}

// Ruta de la orden -> su id (ej.: "/ordenes/42?creada=1" -> 42).
export function idDesdeUrl(url: string, recurso: "ordenes" | "clientes" | "inventario"): number {
  const coincidencia = new URL(url).pathname.match(new RegExp(`/${recurso}/(\\d+)`));
  if (!coincidencia) throw new Error(`La URL ${url} no tiene el id de ${recurso}`);
  return Number(coincidencia[1]);
}
