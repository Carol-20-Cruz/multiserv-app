import { EstadoOrden } from '../../generated/prisma/enums';
import {
  MENSAJES_COTIZACION,
  MENSAJES_VALOR,
  evaluarCotizacion,
  validarValorCotizado,
} from './cotizacion';

describe('Reglas de la cotización aprobada', () => {
  // ---------- evaluarCotizacion: un caso por camino ----------

  // Camino 4: en diagnóstico y sin pagos -> se registra o corrige.
  it('EN_DIAGNOSTICO con 0 pagos: permitido', () => {
    // Act
    const resultado = evaluarCotizacion(EstadoOrden.EN_DIAGNOSTICO, 0);

    // Assert
    expect(resultado).toEqual({ permitido: true });
  });

  // Camino 3 (frontera): con 1 pago el valor queda fijo (respuesta de la dueña).
  it('EN_DIAGNOSTICO con 1 pago: TIENE_PAGOS', () => {
    // Act
    const resultado = evaluarCotizacion(EstadoOrden.EN_DIAGNOSTICO, 1);

    // Assert
    expect(resultado).toEqual({
      permitido: false,
      motivo: 'TIENE_PAGOS',
      mensaje: MENSAJES_COTIZACION.TIENE_PAGOS,
    });
  });

  // Camino 2: cualquier otro estado, aun sin pagos.
  it.each([
    EstadoOrden.RECIBIDO,
    EstadoOrden.EN_REPARACION,
    EstadoOrden.LISTO_PARA_ENTREGA,
    EstadoOrden.ENTREGADO,
  ])('%s con 0 pagos: ESTADO_NO_PERMITE', (estado) => {
    // Act
    const resultado = evaluarCotizacion(estado, 0);

    // Assert
    expect(resultado).toEqual({
      permitido: false,
      motivo: 'ESTADO_NO_PERMITE',
      mensaje: MENSAJES_COTIZACION.ESTADO_NO_PERMITE,
    });
  });

  // Caja blanca: el estado se revisa ANTES que los pagos.
  it('EN_REPARACION con pagos: ESTADO_NO_PERMITE (primero el estado)', () => {
    // Act
    const resultado = evaluarCotizacion(EstadoOrden.EN_REPARACION, 2);

    // Assert
    expect(resultado).toMatchObject({ motivo: 'ESTADO_NO_PERMITE' });
  });

  // Caja blanca, camino 1: cantidad de pagos imposible.
  it.each([-1, 1.5, Number.NaN])(
    'cantidad de pagos %p: lanza RangeError',
    (cantidad) => {
      // Arrange
      const evaluar = () =>
        evaluarCotizacion(EstadoOrden.EN_DIAGNOSTICO, cantidad);

      // Act + Assert
      expect(evaluar).toThrow(RangeError);
    },
  );

  // ---------- validarValorCotizado: un caso por camino ----------

  it.each([undefined, null, ''])('valor %p: VACIO', (valor) => {
    // Act
    const resultado = validarValorCotizado(valor);

    // Assert
    expect(resultado).toEqual({
      valido: false,
      motivo: 'VACIO',
      mensaje: MENSAJES_VALOR.VACIO,
    });
  });

  // SWR-CON-003: sin decimales ni texto.
  it.each(['180000', 1500.5, Number.NaN])('valor %p: NO_ENTERO', (valor) => {
    // Act
    const resultado = validarValorCotizado(valor);

    // Assert
    expect(resultado).toMatchObject({ valido: false, motivo: 'NO_ENTERO' });
  });

  // Frontera inferior: 0 y negativos no.
  it.each([0, -5000])('valor %p: MENOR_A_UNO', (valor) => {
    // Act
    const resultado = validarValorCotizado(valor);

    // Assert
    expect(resultado).toMatchObject({ valido: false, motivo: 'MENOR_A_UNO' });
  });

  // Fronteras válidas: 1 y el tope exacto.
  it.each([1, 999_999_999])('valor %p: válido', (valor) => {
    // Act
    const resultado = validarValorCotizado(valor);

    // Assert
    expect(resultado).toEqual({ valido: true, valor });
  });

  // Frontera superior: uno por encima del tope.
  it('valor 1000000000: MAYOR_AL_TOPE', () => {
    // Act
    const resultado = validarValorCotizado(1_000_000_000);

    // Assert
    expect(resultado).toEqual({
      valido: false,
      motivo: 'MAYOR_AL_TOPE',
      mensaje: MENSAJES_VALOR.MAYOR_AL_TOPE,
    });
  });
});
