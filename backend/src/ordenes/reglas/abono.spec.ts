import { abonoMinimo } from './abono';

describe('Regla del abono mínimo', () => {
  // Validación con la dueña: 50 % de 180.000 -> 90.000 exacto.
  it('180000 al 50 %: 90000', () => {
    // Act
    const abono = abonoMinimo(180000, 50);

    // Assert
    expect(abono).toBe(90000);
  });

  // SWR-CON-003 (frontera): un valor impar redondea hacia arriba.
  it('180001 al 50 %: 90001 (nunca menos del 50 %)', () => {
    // Act
    const abono = abonoMinimo(180001, 50);

    // Assert
    expect(abono).toBe(90001);
  });

  // Frontera inferior del valor: 1 peso al 50 % -> 1.
  it('1 al 50 %: 1', () => {
    // Act
    const abono = abonoMinimo(1, 50);

    // Assert
    expect(abono).toBe(1);
  });

  // Fronteras del porcentaje: 0 % no exige abono; 100 % exige todo.
  it.each([
    [0, 0],
    [100, 180001],
  ])('180001 al %p %%: %p', (porcentaje, esperado) => {
    // Act
    const abono = abonoMinimo(180001, porcentaje);

    // Assert
    expect(abono).toBe(esperado);
  });

  // El tope del valor cotizado (999.999.999) no pierde precisión.
  it('999999999 al 50 %: 500000000', () => {
    // Act
    const abono = abonoMinimo(999999999, 50);

    // Assert
    expect(abono).toBe(500000000);
  });

  // Caja blanca, camino 1: valor cotizado imposible.
  it.each([0, -1000, 1500.5, Number.NaN])(
    'valor %p: lanza RangeError',
    (valor) => {
      // Arrange
      const calcular = () => abonoMinimo(valor, 50);

      // Act + Assert
      expect(calcular).toThrow(RangeError);
    },
  );

  // Caja blanca, camino 2: porcentaje fuera de 0..100.
  it.each([-1, 101, 50.5])('porcentaje %p: lanza RangeError', (porcentaje) => {
    // Arrange
    const calcular = () => abonoMinimo(180000, porcentaje);

    // Act + Assert
    expect(calcular).toThrow(RangeError);
  });
});
