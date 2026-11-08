import {
  calcularBloqueadoHasta,
  debeBloquear,
  estaBloqueada,
  MAX_INTENTOS,
  MINUTOS_BLOQUEO,
  registrarIntentoFallido,
  reiniciarTrasLoginExitoso,
} from './bloqueo';

describe('Reglas de bloqueo de cuenta', () => {
  const AHORA = new Date('2026-11-08T15:00:00.000Z');
  const minutos = (n: number) => n * 60_000;

  // SWR-AUTH-004: una cuenta sin bloqueo registrado puede iniciar sesión.
  it('cuenta no bloqueada: bloqueadoHasta null no está bloqueada', () => {
    // Arrange
    const bloqueadoHasta = null;

    // Act
    const resultado = estaBloqueada(bloqueadoHasta, AHORA);

    // Assert
    expect(resultado).toBe(false);
  });

  // SWR-AUTH-004 (valor frontera): con 4 intentos fallidos NO se bloquea.
  it('4 intentos fallidos (frontera): no bloquea la cuenta', () => {
    // Arrange
    const estado = { intentosFallidos: 3, bloqueadoHasta: null };

    // Act
    const resultado = registrarIntentoFallido(estado, AHORA);

    // Assert
    expect(resultado.intentosFallidos).toBe(4);
    expect(resultado.seBloqueo).toBe(false);
    expect(resultado.bloqueadoHasta).toBeNull();
    expect(debeBloquear(4)).toBe(false);
  });

  // SWR-AUTH-004: en el 5º intento fallido consecutivo se bloquea 10 minutos.
  it('5º intento fallido: bloquea exactamente 10 minutos', () => {
    // Arrange
    const estado = { intentosFallidos: 4, bloqueadoHasta: null };

    // Act
    const resultado = registrarIntentoFallido(estado, AHORA);

    // Assert
    expect(MAX_INTENTOS).toBe(5);
    expect(MINUTOS_BLOQUEO).toBe(10);
    expect(resultado.intentosFallidos).toBe(5);
    expect(resultado.seBloqueo).toBe(true);
    expect(resultado.bloqueadoHasta).toEqual(
      new Date(AHORA.getTime() + minutos(10)),
    );
    expect(calcularBloqueadoHasta(AHORA)).toEqual(resultado.bloqueadoHasta);
  });

  // SWR-AUTH-004: mientras el bloqueo esté vigente la cuenta sigue bloqueada.
  it('bloqueo vigente: falta 1 minuto, sigue bloqueada', () => {
    // Arrange
    const bloqueadoHasta = new Date(AHORA.getTime() + minutos(1));

    // Act
    const resultado = estaBloqueada(bloqueadoHasta, AHORA);

    // Assert
    expect(resultado).toBe(true);
  });

  // SWR-AUTH-004: cuando el bloqueo vence, la cuenta se libera y el
  // siguiente fallo vuelve a contar desde 1 (no se re-bloquea de inmediato).
  it('bloqueo vencido: ya no está bloqueada y el conteo reinicia', () => {
    // Arrange
    const bloqueadoHasta = new Date(AHORA.getTime() - 1);
    const estado = { intentosFallidos: 5, bloqueadoHasta };

    // Act
    const bloqueada = estaBloqueada(bloqueadoHasta, AHORA);
    const siguienteFallo = registrarIntentoFallido(estado, AHORA);

    // Assert
    expect(bloqueada).toBe(false);
    expect(siguienteFallo.intentosFallidos).toBe(1);
    expect(siguienteFallo.seBloqueo).toBe(false);
    expect(siguienteFallo.bloqueadoHasta).toBeNull();
  });

  // SWR-AUTH-004 (frontera exacta): en el instante en que vence, ya no bloquea.
  it('bloqueo que vence exactamente ahora: ya no está bloqueada', () => {
    // Arrange
    const bloqueadoHasta = new Date(AHORA.getTime());

    // Act
    const resultado = estaBloqueada(bloqueadoHasta, AHORA);

    // Assert
    expect(resultado).toBe(false);
  });

  // SWR-AUTH-004 / AJ-02: tras un login correcto el contador vuelve a 0.
  it('login correcto: reinicia el contador y quita el bloqueo', () => {
    // Arrange
    const estadoAntes = { intentosFallidos: 3, bloqueadoHasta: null };

    // Act
    const estadoDespues = reiniciarTrasLoginExitoso();
    const siguienteFallo = registrarIntentoFallido(estadoDespues, AHORA);

    // Assert
    expect(estadoAntes.intentosFallidos).toBe(3);
    expect(estadoDespues).toEqual({ intentosFallidos: 0, bloqueadoHasta: null });
    expect(siguienteFallo.intentosFallidos).toBe(1);
  });
});
