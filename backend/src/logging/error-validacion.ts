import { BadRequestException, type ValidationError } from '@nestjs/common';

// Error 400 por datos inválidos que además recuerda QUÉ campos fallaron
// (solo sus nombres, nunca los valores: pueden ser datos personales).
// AllExceptionsFilter lo registra como VALIDATION_FAILED (WARN).
export class ErrorValidacion extends BadRequestException {
  constructor(
    readonly campos: string[],
    mensajes: string[],
  ) {
    // Mismo formato de respuesta que el ValidationPipe por defecto.
    super({ statusCode: 400, message: mensajes, error: 'Bad Request' });
  }
}

// exceptionFactory del ValidationPipe global.
export function crearErrorValidacion(
  errores: ValidationError[],
): ErrorValidacion {
  const campos: string[] = [];
  const mensajes: string[] = [];

  const recorrer = (lista: ValidationError[], prefijo = '') => {
    for (const error of lista) {
      const campo = prefijo + error.property;
      if (error.constraints) {
        campos.push(campo);
        mensajes.push(...Object.values(error.constraints));
      }
      if (error.children?.length) recorrer(error.children, `${campo}.`);
    }
  };
  recorrer(errores);

  return new ErrorValidacion([...new Set(campos)], mensajes);
}
