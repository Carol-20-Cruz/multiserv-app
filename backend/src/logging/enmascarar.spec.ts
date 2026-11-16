import { enmascararCorreo } from './enmascarar';

describe('enmascararCorreo', () => {
  // Logs Shift Right: el correo nunca se registra completo.
  it('deja la primera letra y el dominio', () => {
    // Arrange
    const correo = 'carol@multiserv.test';

    // Act
    const resultado = enmascararCorreo(correo);

    // Assert
    expect(resultado).toBe('c***@multiserv.test');
    expect(resultado).not.toContain('carol');
  });

  // Logs Shift Right: entradas sin formato de correo no se filtran tal cual.
  it('texto sin @ o vacío se oculta por completo', () => {
    // Arrange
    const entradas = ['sinarroba', '', '@dominio.com'];

    // Act
    const resultados = entradas.map(enmascararCorreo);

    // Assert
    expect(resultados).toEqual(['***', '***', '***']);
  });
});
