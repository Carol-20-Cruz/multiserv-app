import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configurarApp } from './configurar-app';
import { JsonLogger } from './logging/json-logger';

const logger = new JsonLogger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new JsonLogger('Nest'),
  });

  // CORS, validación de DTO y filtro de errores (los mismos de las e2e).
  configurarApp(app);

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
