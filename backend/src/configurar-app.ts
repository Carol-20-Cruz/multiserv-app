import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './logging/all-exceptions.filter';
import { crearErrorValidacion } from './logging/error-validacion';

// Configuración común de la aplicación HTTP. La usan main.ts y las pruebas
// e2e, para que las pruebas validen y respondan igual que el servidor real.
export function configurarApp(app: INestApplication): void {
  // Frontend Next.js en desarrollo.
  app.enableCors({ origin: 'http://localhost:3000' });

  // Valida los DTO y rechaza campos que no estén declarados.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // Un solo mensaje por campo (el primero que falle), no varios repetidos.
      stopAtFirstError: true,
      // Registra VALIDATION_FAILED con los nombres de los campos (sin valores).
      exceptionFactory: crearErrorValidacion,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
}
