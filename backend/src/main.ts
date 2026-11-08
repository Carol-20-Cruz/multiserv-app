import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './logging/all-exceptions.filter';
import { crearErrorValidacion } from './logging/error-validacion';
import { JsonLogger } from './logging/json-logger';

const logger = new JsonLogger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new JsonLogger('Nest'),
  });

  // Frontend Next.js en desarrollo.
  app.enableCors({ origin: 'http://localhost:3000' });

  // Valida los DTO y rechaza campos que no estén declarados.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // Registra VALIDATION_FAILED con los nombres de los campos (sin valores).
      exceptionFactory: crearErrorValidacion,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  logger.event('INFO', 'APP_STARTED', 'Servidor iniciado', { port });
}

bootstrap().catch((error: unknown) => {
  logger.event('ERROR', 'APP_START_FAILED', 'No se pudo iniciar el servidor', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
