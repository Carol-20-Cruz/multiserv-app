import { textoBusqueda } from './texto-busqueda';

describe('Texto de búsqueda sin tildes (defecto 7)', () => {
  // ---------- Pruebas unitarias ----------

  // Defecto 7: el caso reportado. "María" y "Maria" deben dar lo mismo.
  it('"María Fernanda Ortiz" y "Maria Fernanda Ortiz": mismo texto', () => {
    // Act
    const conTilde = textoBusqueda('María Fernanda Ortiz');
    const sinTilde = textoBusqueda('Maria Fernanda Ortiz');

    // Assert
    expect(conTilde).toBe('maria fernanda ortiz');
    expect(sinTilde).toBe(conTilde);
  });

  // Todas las vocales con tilde, en minúscula y mayúscula.
  it.each([
    ['áéíóú', 'aeiou'],
    ['ÁÉÍÓÚ', 'aeiou'],
    ['àèìòù', 'aeiou'],
  ])('%p -> %p', (entrada, esperado) => {
    // Act + Assert
    expect(textoBusqueda(entrada)).toBe(esperado);
  });

  // Diéresis: "desagüe" (el repuesto de la prueba real).
  it('"Bomba de desagüe" -> "bomba de desague"', () => {
    // Act + Assert
    expect(textoBusqueda('Bomba de desagüe')).toBe('bomba de desague');
  });

  // ñ: unaccent (la base) también la cambia por n; deben coincidir.
  it.each([
    ['Muñoz', 'munoz'],
    ['NÚÑEZ', 'nunez'],
  ])('%p -> %p (ñ como n, igual que unaccent)', (entrada, esperado) => {
    // Act + Assert
    expect(textoBusqueda(entrada)).toBe(esperado);
  });

  // Mayúsculas sin tildes.
  it('"ORTIZ" -> "ortiz"', () => {
    // Act + Assert
    expect(textoBusqueda('ORTIZ')).toBe('ortiz');
  });

  // Espacios: se quitan los de los extremos y se deja uno solo entre
  // palabras (así se guardan los nombres, TextoLimpio).
  it('"  María   Fernanda\\t " -> "maria fernanda"', () => {
    // Act + Assert
    expect(textoBusqueda('  María   Fernanda\t ')).toBe('maria fernanda');
  });

  // Números y signos no cambian (referencias, números de orden).
  it('"MS-2026-00002" -> "ms-2026-00002"', () => {
    // Act + Assert
    expect(textoBusqueda('MS-2026-00002')).toBe('ms-2026-00002');
  });

  // Frontera: vacío y solo espacios quedan vacíos.
  it.each([[''], ['   ']])('%p -> ""', (entrada) => {
    // Act + Assert
    expect(textoBusqueda(entrada)).toBe('');
  });

  // Una tilde suelta (sin letra) desaparece: el servicio no busca por nombre.
  it('una tilde suelta "\\u0301" -> ""', () => {
    // Act + Assert
    expect(textoBusqueda('́')).toBe('');
  });
});
