import {
  MENSAJES_CANTIDAD,
  esStockBajo,
  evaluarCambioStock,
  validarCantidadEntrada,
} from './stock';

describe('Reglas del stock de repuestos', () => {
  // ---------- esStockBajo: valores frontera de SWR-INV-009 ----------

  // SWR-INV-009: por debajo del mínimo -> bajo.
  it('4 con mínimo 5: stock bajo', () => {
    // Arrange
    const cantidad = 4;
    const minimo = 5;

    // Act
    const bajo = esStockBajo(cantidad, minimo);

    // Assert
    expect(bajo).toBe(true);
  });

  // SWR-INV-009 (frontera): igual al mínimo ("llega al mínimo") -> bajo.
  it('5 con mínimo 5: stock bajo', () => {
    // Arrange
    const cantidad = 5;
    const minimo = 5;

    // Act
    const bajo = esStockBajo(cantidad, minimo);

    // Assert
    expect(bajo).toBe(true);
  });

  // SWR-INV-009 (frontera): uno por encima del mínimo -> normal.
  it('6 con mínimo 5: stock normal', () => {
    // Arrange
    const cantidad = 6;
    const minimo = 5;

    // Act
    const bajo = esStockBajo(cantidad, minimo);

    // Assert
    expect(bajo).toBe(false);
  });

  // SWR-INV-009: mínimo 0 permitido; solo alerta cuando se agota.
  it('mínimo 0: con 0 es bajo y con 1 es normal', () => {
    // Arrange
    const minimo = 0;

    // Act
    const conCero = esStockBajo(0, minimo);
    const conUno = esStockBajo(1, minimo);

    // Assert
    expect(conCero).toBe(true);
    expect(conUno).toBe(false);
  });

  // Caja blanca, camino 1: datos imposibles lanzan RangeError.
  it.each([
    [-1, 5],
    [3, -1],
    [2.5, 5],
    [Number.NaN, 5],
  ])('cantidad %p con mínimo %p: lanza RangeError', (cantidad, minimo) => {
    // Arrange
    const evaluar = () => esStockBajo(cantidad, minimo);

    // Act + Assert
    expect(evaluar).toThrow(RangeError);
  });

  // ---------- evaluarCambioStock: un caso por camino ----------

  // SWR-INV-009: repuesto nuevo creado ya en el mínimo -> alertar.
  it('repuesto nuevo con stock en el mínimo: ENTRA_EN_BAJO', () => {
    // Arrange
    const despues = { cantidad: 2, minimo: 2 };

    // Act
    const cambio = evaluarCambioStock(null, despues);

    // Assert
    expect(cambio).toBe('ENTRA_EN_BAJO');
  });

  // SWR-INV-009: subir el mínimo deja el repuesto bajo -> alertar.
  it('subir el mínimo de 2 a 5 con 4 unidades: ENTRA_EN_BAJO', () => {
    // Arrange
    const antes = { cantidad: 4, minimo: 2 };
    const despues = { cantidad: 4, minimo: 5 };

    // Act
    const cambio = evaluarCambioStock(antes, despues);

    // Assert
    expect(cambio).toBe('ENTRA_EN_BAJO');
  });

  // Una entrada pequeña no saca al repuesto del stock bajo -> no repetir alerta.
  it('entrada de 1 con 0 unidades y mínimo 3: SIGUE_BAJO', () => {
    // Arrange
    const antes = { cantidad: 0, minimo: 3 };
    const despues = { cantidad: 1, minimo: 3 };

    // Act
    const cambio = evaluarCambioStock(antes, despues);

    // Assert
    expect(cambio).toBe('SIGUE_BAJO');
  });

  // Una entrada suficiente lo saca del stock bajo.
  it('entrada de 10 con 1 unidad y mínimo 3: SALE_DE_BAJO', () => {
    // Arrange
    const antes = { cantidad: 1, minimo: 3 };
    const despues = { cantidad: 11, minimo: 3 };

    // Act
    const cambio = evaluarCambioStock(antes, despues);

    // Assert
    expect(cambio).toBe('SALE_DE_BAJO');
  });

  // Estaba bien y sigue bien (repuesto nuevo con stock de sobra).
  it('repuesto nuevo con 10 unidades y mínimo 2: NORMAL', () => {
    // Arrange
    const despues = { cantidad: 10, minimo: 2 };

    // Act
    const cambio = evaluarCambioStock(null, despues);

    // Assert
    expect(cambio).toBe('NORMAL');
  });

  // ---------- validarCantidadEntrada: un caso por camino ----------

  // Camino 1: no llegó la cantidad.
  it.each([undefined, null, ''])('cantidad %p: inválida por VACIO', (valor) => {
    // Act
    const resultado = validarCantidadEntrada(valor);

    // Assert
    expect(resultado).toEqual({
      valido: false,
      motivo: 'VACIO',
      mensaje: MENSAJES_CANTIDAD.VACIO,
    });
  });

  // Camino 2: no es un entero.
  it.each(['5', 2.5, Number.NaN])(
    'cantidad %p: inválida por NO_ENTERO',
    (valor) => {
      // Act
      const resultado = validarCantidadEntrada(valor);

      // Assert
      expect(resultado).toEqual({
        valido: false,
        motivo: 'NO_ENTERO',
        mensaje: MENSAJES_CANTIDAD.NO_ENTERO,
      });
    },
  );

  // Camino 3 (frontera): 0 y negativos no suman nada.
  it.each([0, -3])('cantidad %p: inválida por MENOR_A_UNO', (valor) => {
    // Act
    const resultado = validarCantidadEntrada(valor);

    // Assert
    expect(resultado).toEqual({
      valido: false,
      motivo: 'MENOR_A_UNO',
      mensaje: MENSAJES_CANTIDAD.MENOR_A_UNO,
    });
  });

  // Camino 4 (frontera): 1 es la menor entrada válida.
  it('cantidad 1: válida', () => {
    // Act
    const resultado = validarCantidadEntrada(1);

    // Assert
    expect(resultado).toEqual({ valido: true, cantidad: 1 });
  });
});
