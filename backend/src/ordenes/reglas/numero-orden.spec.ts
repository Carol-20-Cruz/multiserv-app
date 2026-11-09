import { anioColombia, formatearNumeroOrden } from './numero-orden';

describe('Reglas del número de orden', () => {
  // ---------- formatearNumeroOrden: SWR-ORD-002 ----------

  // SWR-ORD-002 (frontera inferior): el primer número del año.
  it('2026 con consecutivo 1: MS-2026-00001', () => {
    // Act
    const numero = formatearNumeroOrden(2026, 1);

    // Assert
    expect(numero).toBe('MS-2026-00001');
  });

  // SWR-ORD-002: rellena con ceros hasta 5 dígitos.
  it('2026 con consecutivo 427: MS-2026-00427', () => {
    // Act
    const numero = formatearNumeroOrden(2026, 427);

    // Assert
    expect(numero).toBe('MS-2026-00427');
  });

  // SWR-ORD-002 (frontera superior): el último que cabe en 5 dígitos.
  it('2026 con consecutivo 99999: MS-2026-99999', () => {
    // Act
    const numero = formatearNumeroOrden(2026, 99999);

    // Assert
    expect(numero).toBe('MS-2026-99999');
  });

  // Caja blanca, camino 2: consecutivos fuera de 1..99999 o no enteros.
  it.each([0, -1, 100000, 2.5, Number.NaN])(
    'consecutivo %p: lanza RangeError',
    (consecutivo) => {
      // Arrange
      const formatear = () => formatearNumeroOrden(2026, consecutivo);

      // Act + Assert
      expect(formatear).toThrow(RangeError);
    },
  );

  // Caja blanca, camino 1: año que no tiene 4 dígitos.
  it.each([999, 10000, 2026.5])('año %p: lanza RangeError', (anio) => {
    // Arrange
    const formatear = () => formatearNumeroOrden(anio, 1);

    // Act + Assert
    expect(formatear).toThrow(RangeError);
  });

  // ---------- anioColombia: AJ-06 (el consecutivo se reinicia cada año) ----------

  // AJ-06 (frontera): 31/12/2026 11:59 p. m. en Colombia = 04:59 UTC del 1/1.
  it('2027-01-01T04:59:59Z: todavía es 2026 en Colombia', () => {
    // Arrange
    const fecha = new Date('2027-01-01T04:59:59Z');

    // Act
    const anio = anioColombia(fecha);

    // Assert
    expect(anio).toBe(2026);
  });

  // AJ-06 (frontera): medianoche en Colombia = 05:00 UTC -> año nuevo.
  it('2027-01-01T05:00:00Z: ya es 2027 en Colombia', () => {
    // Arrange
    const fecha = new Date('2027-01-01T05:00:00Z');

    // Act
    const anio = anioColombia(fecha);

    // Assert
    expect(anio).toBe(2027);
  });

  // Una fecha cualquiera a mitad de año.
  it('2026-11-09T15:00:00Z: 2026', () => {
    // Act
    const anio = anioColombia(new Date('2026-11-09T15:00:00Z'));

    // Assert
    expect(anio).toBe(2026);
  });

  // Caja blanca, camino 1: fecha inválida.
  it('fecha inválida: lanza RangeError', () => {
    // Arrange
    const leer = () => anioColombia(new Date('no es fecha'));

    // Act + Assert
    expect(leer).toThrow(RangeError);
  });
});
