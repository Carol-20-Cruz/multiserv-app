// Defecto 7: normalizar el texto que se busca — función pura (sin base de
// datos), probada con pruebas unitarias y de caja blanca.
//
// Es la MISMA regla que public.texto_busqueda() de la base (migración
// busqueda_sin_tildes), que llena "nombreBusqueda" con
// lower(unaccent(nombre)). Si cambia una, hay que cambiar la otra.
//   "  María   FERNANDA " -> "maria fernanda"
//   "Bomba de desagüe"    -> "bomba de desague"
//   "Muñoz"               -> "munoz"   (unaccent también cambia ñ por n)

// Marcas diacríticas que quedan sueltas tras separar las letras (NFD):
// tilde, diéresis, virgulilla de la ñ...
const MARCAS = /\p{Mn}/gu;

export function textoBusqueda(valor: string): string {
  return valor
    .normalize('NFD') // "á" -> "a" + tilde suelta
    .replace(MARCAS, '') // quita la tilde suelta
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // los nombres se guardan con un solo espacio
}
