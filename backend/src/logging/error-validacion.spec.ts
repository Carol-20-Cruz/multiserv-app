import type { ValidationError } from '@nestjs/common';
import { crearErrorValidacion } from './error-validacion';

describe('crearErrorValidacion', () => {
  // Logs sin datos personales: VALIDATION_FAILED guarda nombres de campos,
  // nunca los valores que envió el usuario.
  it('guarda los nombres de los campos y no los valores', () => {
    // Arrange
    const errores = [
      {
        property: 'telefono',
        value: '300abc4567',
        constraints: { telefonoValido: 'El teléfono solo puede tener números' },
        children: [],
      },
      {
        property: 'nombre',
        value: '',
        constraints: { isNotEmpty: 'El nombre es obligatorio' },
        children: [],
      },
    ] as ValidationError[];

    // Act
    const error = crearErrorValidacion(errores);

    // Assert
    expect(error.getStatus()).toBe(400);
    expect(error.campos).toEqual(['telefono', 'nombre']);
    expect(error.getResponse()).toEqual({
      statusCode: 400,
      message: [
        'El teléfono solo puede tener números',
        'El nombre es obligatorio',
      ],
      error: 'Bad Request',
    });
    expect(JSON.stringify(error.campos)).not.toContain('300abc4567');
  });
});
