import { LoggerService } from '@nestjs/common';

export type NivelLog = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface EntradaLog {
  timestamp: string;
  level: NivelLog;
  context: string;
  event: string;
  message: string;
  metadata: Record<string, unknown>;
}

// Logger estructurado (Shift Right): cada evento es una línea JSON.
// REGLA: nunca enviar contraseñas, hashes ni tokens en metadata;
// solo userId o el correo enmascarado (ver enmascarar.ts).
export class JsonLogger implements LoggerService {
  constructor(private readonly context = 'App') {}

  // Eventos de negocio con nombre propio (LOGIN_SUCCESS, ACCOUNT_LOCKED, ...).
  event(
    level: NivelLog,
    event: string,
    message: string,
    metadata: Record<string, unknown> = {},
    context = this.context,
  ): void {
    const entrada: EntradaLog = {
      timestamp: new Date().toISOString(),
      level,
      context,
      event,
      message,
      metadata,
    };
    const linea = JSON.stringify(entrada);
    if (level === 'ERROR') {
      process.stderr.write(linea + '\n');
    } else {
      process.stdout.write(linea + '\n');
    }
  }

  // Métodos de LoggerService: así los mensajes internos de NestJS
  // también salen en formato JSON.
  log(message: unknown, context?: string): void {
    this.event('INFO', 'NEST_LOG', String(message), {}, context);
  }

  warn(message: unknown, context?: string): void {
    this.event('WARN', 'NEST_WARN', String(message), {}, context);
  }

  error(message: unknown, stack?: string, context?: string): void {
    this.event('ERROR', 'NEST_ERROR', String(message), { stack }, context);
  }

  debug(message: unknown, context?: string): void {
    this.event('DEBUG', 'NEST_DEBUG', String(message), {}, context);
  }

  verbose(message: unknown, context?: string): void {
    this.debug(message, context);
  }
}
