import { EstadoOrden, TipoPago } from '../../generated/prisma/enums';
import {
  MENSAJES_PAGO,
  OrdenParaPago,
  calcularSaldo,
  puedeEntregar,
  tipoPago,
  validarPago,
  vencimientoGarantia,
} from './saldo';

// Orden de la prueba real: cotizada en $ 250.000.
const orden = (cambios: Partial<OrdenParaPago> = {}): OrdenParaPago => ({
  estado: EstadoOrden.EN_DIAGNOSTICO,
  valorCotizado: 250000,
  pagos: [],
  ...cambios,
});

describe('Regla del saldo (SWR-PAY-004)', () => {
  // Camino 5: sin pagos, el saldo es todo el valor cotizado.
  it('250000 sin pagos: saldo 250000', () => {
    // Act
    const saldo = calcularSaldo(250000, []);

    // Assert
    expect(saldo).toBe(250000);
  });

  // Camino 5: varios pagos se suman.
  it('250000 con 125000 + 100000: saldo 25000', () => {
    // Act
    const saldo = calcularSaldo(250000, [125000, 100000]);

    // Assert
    expect(saldo).toBe(25000);
  });

  // Frontera: pagado exactamente el total -> 0 (y 1 peso antes -> 1).
  it.each([
    [[250000], 0],
    [[249999], 1],
  ])('250000 con pagos %p: saldo %p', (pagos, esperado) => {
    // Act
    const saldo = calcularSaldo(250000, pagos);

    // Assert
    expect(saldo).toBe(esperado);
  });

  // Camino 2: sin cotización no hay saldo.
  it('sin valor cotizado y sin pagos: null', () => {
    // Act
    const saldo = calcularSaldo(null, []);

    // Assert
    expect(saldo).toBeNull();
  });

  // Camino 2: pagos sin cotización es un dato imposible.
  it('sin valor cotizado con pagos: lanza RangeError', () => {
    // Arrange
    const calcular = () => calcularSaldo(null, [1000]);

    // Act + Assert
    expect(calcular).toThrow(RangeError);
  });

  // Camino 4 (frontera): total + 1 peso.
  it('pagos que superan el total por 1: lanza RangeError', () => {
    // Arrange
    const calcular = () => calcularSaldo(250000, [125000, 125001]);

    // Act + Assert
    expect(calcular).toThrow(RangeError);
  });

  // Camino 1: pagos imposibles.
  it.each([[[-1]], [[1000.5]], [[Number.NaN]]])(
    'pagos %p: lanza RangeError',
    (pagos) => {
      // Arrange
      const calcular = () => calcularSaldo(250000, pagos);

      // Act + Assert
      expect(calcular).toThrow(RangeError);
    },
  );

  // Camino 3: valor cotizado imposible.
  it.each([0, -1, 1500.5])('valor cotizado %p: lanza RangeError', (valor) => {
    // Arrange
    const calcular = () => calcularSaldo(valor, []);

    // Act + Assert
    expect(calcular).toThrow(RangeError);
  });
});

describe('Regla para validar un pago (SWR-PAY-004)', () => {
  // ---------- Caminos 1 a 3: el valor ----------

  it.each([undefined, null, ''])('valor %p: VACIO', (valor) => {
    // Act
    const resultado = validarPago(valor, orden());

    // Assert
    expect(resultado).toEqual({
      valido: false,
      motivo: 'VACIO',
      mensaje: MENSAJES_PAGO.VACIO,
    });
  });

  it.each(['125000', 1000.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'valor %p: NO_ENTERO',
    (valor) => {
      // Act
      const resultado = validarPago(valor, orden());

      // Assert
      expect(resultado).toMatchObject({ valido: false, motivo: 'NO_ENTERO' });
    },
  );

  // Frontera inferior: 0 no, 1 sí.
  it.each([0, -1])('valor %p: MENOR_A_UNO', (valor) => {
    // Act
    const resultado = validarPago(valor, orden());

    // Assert
    expect(resultado).toMatchObject({ valido: false, motivo: 'MENOR_A_UNO' });
  });

  it('valor 1: válido', () => {
    // Act
    const resultado = validarPago(1, orden());

    // Assert
    expect(resultado).toEqual({
      valido: true,
      valor: 1,
      saldo: 250000,
      saldoResultante: 249999,
    });
  });

  // ---------- Caminos 4 y 5: la orden ----------

  it('orden entregada: ORDEN_ENTREGADA', () => {
    // Act
    const resultado = validarPago(
      1000,
      orden({ estado: EstadoOrden.ENTREGADO, pagos: [250000] }),
    );

    // Assert
    expect(resultado).toEqual({
      valido: false,
      motivo: 'ORDEN_ENTREGADA',
      mensaje: MENSAJES_PAGO.ORDEN_ENTREGADA,
    });
  });

  // Caja blanca: entregada con saldo 0 responde ORDEN_ENTREGADA, no
  // SUPERA_SALDO (la orden se revisa antes que el saldo).
  it('entregada con saldo 0 y valor 1: ORDEN_ENTREGADA (no SUPERA_SALDO)', () => {
    // Act
    const resultado = validarPago(
      1,
      orden({ estado: EstadoOrden.ENTREGADO, pagos: [250000] }),
    );

    // Assert
    expect(resultado).toMatchObject({ motivo: 'ORDEN_ENTREGADA' });
  });

  // Caja blanca: el valor se revisa antes que la orden.
  it('entregada con valor vacío: VACIO (primero el valor)', () => {
    // Act
    const resultado = validarPago(
      '',
      orden({ estado: EstadoOrden.ENTREGADO, pagos: [250000] }),
    );

    // Assert
    expect(resultado).toMatchObject({ motivo: 'VACIO' });
  });

  it.each([EstadoOrden.RECIBIDO, EstadoOrden.EN_DIAGNOSTICO])(
    '%s sin cotización: SIN_VALOR_COTIZADO',
    (estado) => {
      // Act
      const resultado = validarPago(
        1000,
        orden({ estado, valorCotizado: null }),
      );

      // Assert
      expect(resultado).toEqual({
        valido: false,
        motivo: 'SIN_VALOR_COTIZADO',
        mensaje: MENSAJES_PAGO.SIN_VALOR_COTIZADO,
      });
    },
  );

  // ---------- Caminos 6 y 7: el saldo ----------

  // Frontera superior: exactamente el saldo es válido; saldo + 1 no.
  it('valor = saldo (125000): válido y deja saldo 0', () => {
    // Act
    const resultado = validarPago(125000, orden({ pagos: [125000] }));

    // Assert
    expect(resultado).toEqual({
      valido: true,
      valor: 125000,
      saldo: 125000,
      saldoResultante: 0,
    });
  });

  it('valor = saldo + 1 (125001): SUPERA_SALDO', () => {
    // Act
    const resultado = validarPago(125001, orden({ pagos: [125000] }));

    // Assert
    expect(resultado).toEqual({
      valido: false,
      motivo: 'SUPERA_SALDO',
      mensaje: MENSAJES_PAGO.SUPERA_SALDO,
    });
  });

  // Saldo 0 sin entregar: cualquier pago supera el saldo.
  it('LISTO_PARA_ENTREGA con saldo 0 y valor 1: SUPERA_SALDO', () => {
    // Act
    const resultado = validarPago(
      1,
      orden({ estado: EstadoOrden.LISTO_PARA_ENTREGA, pagos: [250000] }),
    );

    // Assert
    expect(resultado).toMatchObject({ motivo: 'SUPERA_SALDO' });
  });

  // Pagos permitidos de EN_DIAGNOSTICO (con cotización) a LISTO_PARA_ENTREGA.
  it.each([
    EstadoOrden.EN_DIAGNOSTICO,
    EstadoOrden.EN_REPARACION,
    EstadoOrden.LISTO_PARA_ENTREGA,
  ])('%s con cotización: abono de 125000 válido', (estado) => {
    // Act
    const resultado = validarPago(125000, orden({ estado }));

    // Assert
    expect(resultado).toMatchObject({ valido: true, saldoResultante: 125000 });
  });
});

describe('Regla del tipo de pago', () => {
  // Frontera: saldo - 1 es abono; exactamente el saldo es SALDO.
  it.each([
    [1, 250000, TipoPago.ABONO],
    [125000, 250000, TipoPago.ABONO],
    [249999, 250000, TipoPago.ABONO],
    [250000, 250000, TipoPago.SALDO],
    [1, 1, TipoPago.SALDO],
  ])('pago %p con saldo %p: %s', (valor, saldo, esperado) => {
    // Act
    const tipo = tipoPago(valor, saldo);

    // Assert
    expect(tipo).toBe(esperado);
  });

  // Camino 1: datos imposibles.
  it.each([
    [0, 1000],
    [1001, 1000],
    [10.5, 1000],
  ])('pago %p con saldo %p: lanza RangeError', (valor, saldo) => {
    // Arrange
    const calcular = () => tipoPago(valor, saldo);

    // Act + Assert
    expect(calcular).toThrow(RangeError);
  });
});

describe('Regla para entregar (SWR-ENT-003)', () => {
  // Frontera del saldo: 0 sí, 1 no.
  it('LISTO_PARA_ENTREGA con saldo 0: puede entregar', () => {
    // Act
    const puede = puedeEntregar(EstadoOrden.LISTO_PARA_ENTREGA, 0);

    // Assert
    expect(puede).toBe(true);
  });

  it('LISTO_PARA_ENTREGA con saldo 1: no puede', () => {
    // Act
    const puede = puedeEntregar(EstadoOrden.LISTO_PARA_ENTREGA, 1);

    // Assert
    expect(puede).toBe(false);
  });

  it('LISTO_PARA_ENTREGA sin cotización (saldo null): no puede', () => {
    // Act
    const puede = puedeEntregar(EstadoOrden.LISTO_PARA_ENTREGA, null);

    // Assert
    expect(puede).toBe(false);
  });

  // Camino 1: con saldo 0 pero en otro estado.
  it.each([
    EstadoOrden.RECIBIDO,
    EstadoOrden.EN_DIAGNOSTICO,
    EstadoOrden.EN_REPARACION,
    EstadoOrden.ENTREGADO,
  ])('%s con saldo 0: no puede', (estado) => {
    // Act
    const puede = puedeEntregar(estado, 0);

    // Assert
    expect(puede).toBe(false);
  });
});

describe('Regla del vencimiento de la garantía', () => {
  // 10/11/2026 15:00 en Colombia (20:00 UTC) + 30 días -> 10/12/2026
  // 23:59:59.999 en Colombia = 11/12/2026 04:59:59.999 UTC.
  it('entrega a media tarde + 30 días: fin del día 30 en Colombia', () => {
    // Act
    const vence = vencimientoGarantia(new Date('2026-11-10T20:00:00Z'), 30);

    // Assert
    expect(vence.toISOString()).toBe('2026-12-11T04:59:59.999Z');
  });

  // Cerca de medianoche: 23:59 del 10/11 en Colombia ya es 11/11 en UTC.
  // Debe contar desde el 10/11 (día de Colombia), no desde el 11/11.
  it('entrega a las 23:59 de Colombia (04:59 UTC del día siguiente)', () => {
    // Act
    const vence = vencimientoGarantia(new Date('2026-11-11T04:59:00Z'), 30);

    // Assert
    expect(vence.toISOString()).toBe('2026-12-11T04:59:59.999Z');
  });

  // Un minuto después de medianoche en Colombia ya es el día 11.
  it('entrega a las 00:00 de Colombia del 11/11: cuenta desde el 11', () => {
    // Act
    const vence = vencimientoGarantia(new Date('2026-11-11T05:00:00Z'), 30);

    // Assert
    expect(vence.toISOString()).toBe('2026-12-12T04:59:59.999Z');
  });

  // Frontera: 0 días -> vence al final del mismo día de la entrega.
  it('0 días: vence al final del día de la entrega', () => {
    // Act
    const vence = vencimientoGarantia(new Date('2026-11-10T20:00:00Z'), 0);

    // Assert
    expect(vence.toISOString()).toBe('2026-11-11T04:59:59.999Z');
  });

  // Cambio de año.
  it('entrega el 31/12 + 1 día: fin del 01/01', () => {
    // Act
    const vence = vencimientoGarantia(new Date('2026-12-31T15:00:00Z'), 1);

    // Assert
    expect(vence.toISOString()).toBe('2027-01-02T04:59:59.999Z');
  });

  // Camino 1: datos imposibles.
  it.each([-1, 1.5])('días %p: lanza RangeError', (dias) => {
    // Arrange
    const calcular = () => vencimientoGarantia(new Date(), dias);

    // Act + Assert
    expect(calcular).toThrow(RangeError);
  });

  it('fecha inválida: lanza RangeError', () => {
    // Arrange
    const calcular = () => vencimientoGarantia(new Date('no es fecha'), 30);

    // Act + Assert
    expect(calcular).toThrow(RangeError);
  });
});
