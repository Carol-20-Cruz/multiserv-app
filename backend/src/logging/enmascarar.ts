// Oculta el correo para los logs: "carol@multiserv.test" -> "c***@multiserv.test".
// Nunca se debe registrar el correo completo de un intento de login.
export function enmascararCorreo(correo: string): string {
  const limpio = (correo ?? '').trim();
  const arroba = limpio.lastIndexOf('@');
  if (arroba <= 0) {
    return '***';
  }
  return `${limpio[0]}***${limpio.slice(arroba)}`;
}
