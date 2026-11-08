// Seed SOLO de usuarios de prueba (1 Dueño y 1 Técnico).
// Las contraseñas se leen de SEED_DUENO_PASSWORD y SEED_TECNICO_PASSWORD;
// nunca se escriben en el código. Uso: npm run seed
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import { PrismaClient, Rol } from './generated/prisma/client';

const RONDAS_BCRYPT = 10;

function leerVariable(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre} en backend/.env`);
  }
  return valor;
}

async function main(): Promise<void> {
  const usuarios = [
    {
      nombre: 'Dueño de Prueba',
      correo: 'dueno@multiserv.test',
      rol: Rol.DUENO,
      password: leerVariable('SEED_DUENO_PASSWORD'),
    },
    {
      nombre: 'Técnico de Prueba',
      correo: 'tecnico@multiserv.test',
      rol: Rol.TECNICO,
      password: leerVariable('SEED_TECNICO_PASSWORD'),
    },
  ];

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: leerVariable('DATABASE_URL') }),
  });

  try {
    for (const { password, ...datos } of usuarios) {
      const passwordHash = await bcrypt.hash(password, RONDAS_BCRYPT);
      // upsert: crea el usuario o lo deja como nuevo si ya existía.
      await prisma.usuario.upsert({
        where: { correo: datos.correo },
        create: { ...datos, passwordHash },
        update: {
          ...datos,
          passwordHash,
          activo: true,
          intentosFallidos: 0,
          bloqueadoHasta: null,
        },
      });
      console.log(`Usuario de prueba listo: ${datos.correo} (${datos.rol})`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    'Error en el seed:',
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
