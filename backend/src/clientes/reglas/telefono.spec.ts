import {
  LONGITUD_TELEFONO,
  MENSAJES_TELEFONO,
  normalizarTelefono,
  validarTelefono,
} from './telefono';

describe('Reglas del teléfono del cliente', () => {
  // ---------- Pruebas unitarias (valores frontera de SWR-CLI-003) ----------

  // SWR-CLI-003 (frontera inferior): 9 dígitos es inválido.
  it('9 dígitos: inválido por longitud', () => {
    // Arrange
    const telefono = '300123456';

    // Act
    const resultado = validarTelefono(telefono);

    // Assert
    expect(resultado).toEqual({
      valido: false,
      motivo: 'LONGITUD',
      mensaje: MENSAJES_TELEFONO.LONGITUD,
    });
  });

  // SWR-CLI-003: exactamente 10 dígitos es válido.
  it('10 dígitos: válido', () => {
    // Arrange
    const telefono = '3001234567';

    // Act
    const resultado = validarTelefono(telefono);

    // Assert
    expect(LONGITUD_TELEFONO).toBe(10);
    expect(resultado).toEqual({ valido: true, telefono: '3001234567' });
  });

  // SWR-CLI-003 (frontera superior): 11 dígitos es inválido.
  it('11 dígitos: inválido por longitud', () => {
    // Arrange
    const telefono = '30012345678';

    // Act
    const resultado = validarTelefono(telefono);

    // Assert
    expect(resultado.valido).toBe(false);
    expect(resultado).toMatchObject({ motivo: 'LONGITUD' });
  });

  // SWR-CLI-003: con letras es inválido aunque tenga 10 caracteres.
  it('con letras (10 caracteres): inválido por caracteres', () => {
    // Arrange
    const telefono = '300abc4567';

    // Act
    const resultado = validarTelefono(telefono);

    // Assert
    expect(resultado).toEqual({
      valido: false,
      motivo: 'CARACTERES_INVALIDOS',
      mensaje: MENSAJES_TELEFONO.CARACTERES_INVALIDOS,
    });
  });

  // SWR-CLI-003 + AJ-08: los espacios se quitan y quedan 10 dígitos.
  it('con espacios (300 123 4567): válido y normalizado', () => {
    // Arrange
    const telefono = ' 300 123 4567 ';

    // Act
    const resultado = validarTelefono(telefono);

    // Assert
    expect(resultado).toEqual({ valido: true, telefono: '3001234567' });
  });

  // SWR-CLI-003 + AJ-08: los guiones también se quitan.
  it('con guiones (300-123-4567): válido y normalizado', () => {
    // Arrange
    const telefono = '300-123-4567';

    // Act
    const resultado = validarTelefono(telefono);

    // Assert
    expect(resultado).toEqual({ valido: true, telefono: '3001234567' });
  });

  // SWR-CLI-003 + AJ-08: con espacios pero solo 9 dígitos sigue inválido.
  it('con espacios y 9 dígitos: inválido por longitud', () => {
    // Arrange
    const telefono = '300 123 456';

    // Act
    const resultado = validarTelefono(telefono);

    // Assert
    expect(resultado).toMatchObject({ valido: false, motivo: 'LONGITUD' });
  });

  // ---------- Caja blanca: un caso por cada camino de validarTelefono ----------

  // SWR-CLI-001 / camino 1: valor que no es texto.
  it('camino 1a: valor no texto (undefined) → VACIO', () => {
    // Arrange
    const valor = undefined;

    // Act
    const resultado = validarTelefono(valor);

    // Assert
    expect(resultado).toMatchObject({ valido: false, motivo: 'VACIO' });
  });

  // SWR-CLI-001 / camino 1: texto que queda vacío tras normalizar.
  it('camino 1b: solo espacios y guiones → VACIO', () => {
    // Arrange
    const valor = '  - -  ';

    // Act
    const resultado = validarTelefono(valor);

    // Assert
    expect(resultado).toEqual({
      valido: false,
      motivo: 'VACIO',
      mensaje: MENSAJES_TELEFONO.VACIO,
    });
  });

  // SWR-CLI-003 / camino 2: otros símbolos (prefijo +57, puntos) no se quitan.
  it('camino 2: con +57 o puntos → CARACTERES_INVALIDOS', () => {
    // Arrange
    const conPrefijo = '+57 300 123 4567';
    const conPuntos = '300.123.4567';

    // Act
    const r1 = validarTelefono(conPrefijo);
    const r2 = validarTelefono(conPuntos);

    // Assert
    expect(r1).toMatchObject({ valido: false, motivo: 'CARACTERES_INVALIDOS' });
    expect(r2).toMatchObject({ valido: false, motivo: 'CARACTERES_INVALIDOS' });
  });

  // AJ-08: normalizarTelefono solo limpia, no valida.
  it('normalizarTelefono quita espacios (incluido tabulador) y guiones', () => {
    // Arrange
    const valor = '300\t123-45 67';

    // Act
    const resultado = normalizarTelefono(valor);

    // Assert
    expect(resultado).toBe('3001234567');
  });
});
