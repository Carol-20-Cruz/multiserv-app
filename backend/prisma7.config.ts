import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  // Dónde están las tablas
  schema: 'prisma/schema.prisma',

  // Dónde se guarda el historial de cambios de la base de datos
  migrations: {
    path: 'prisma/migrations',
  },

  // Conexión que usa Prisma para crear/modificar tablas.
  // Usamos la DIRECTA (puerto 5432) porque las migraciones no funcionan bien por el pooler.
  datasource: {
    url: env('DIRECT_URL'),
  },
});
