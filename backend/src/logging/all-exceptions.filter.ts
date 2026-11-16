import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ErrorValidacion } from './error-validacion';
import { JsonLogger } from './json-logger';

// Atrapa cualquier error. Los errores esperados (400, 401, 403, 423...) se
// responden tal cual; los inesperados (500) se registran como ERROR y al
// cliente solo se le da un mensaje genérico, sin detalles internos.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new JsonLogger('AllExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<Request>();

    if (exception instanceof ErrorValidacion) {
      this.logger.event('WARN', 'VALIDATION_FAILED', 'Datos inválidos', {
        method: req.method,
        path: req.path,
        campos: exception.campos,
      });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const cuerpo = exception.getResponse();
      res
        .status(status)
        .json(
          typeof cuerpo === 'string'
            ? { statusCode: status, message: cuerpo }
            : cuerpo,
        );
      return;
    }

    const error = exception instanceof Error ? exception : undefined;
    this.logger.event('ERROR', 'UNHANDLED_ERROR', 'Error no controlado', {
      method: req.method,
      path: req.path,
      error: error?.name ?? 'Unknown',
      detail: error?.message,
    });

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
    });
  }
}
