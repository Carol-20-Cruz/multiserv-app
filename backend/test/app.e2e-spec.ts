import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/configurar-app';
import { PrismaService } from '../src/prisma/prisma.service';

// Pruebas e2e de la aplicación completa (rutas, guards, pipes y filtro de
// errores) SIN base de datos: PrismaService se reemplaza por un objeto vacío,
// así no se conecta ni escribe nada, y cualquier consulta fallaría. Corren
// igual en local y en GitHub Actions (no necesitan el .env).
process.env.JWT_SECRET = 'secreto-solo-para-pruebas-e2e';

describe('Autenticación (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication({ logger: false });
    configurarApp(app);
    await app.init();
    jwt = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /auth/perfil sin token responde 401', () => {
    return request(app.getHttpServer()).get('/auth/perfil').expect(401);
  });

  it('GET /auth/perfil con un token firmado con otro secreto responde 401', async () => {
    const ajeno = await jwt.signAsync(
      { sub: 1, nombre: 'Dueño de Prueba', rol: 'DUENO' },
      { secret: 'otro-secreto' },
    );
    return request(app.getHttpServer())
      .get('/auth/perfil')
      .set('Authorization', `Bearer ${ajeno}`)
      .expect(401);
  });

  it('GET /auth/perfil con un token vencido responde 401', async () => {
    const vencido = await jwt.signAsync(
      { sub: 1, nombre: 'Dueño de Prueba', rol: 'DUENO' },
      { expiresIn: -10 },
    );
    return request(app.getHttpServer())
      .get('/auth/perfil')
      .set('Authorization', `Bearer ${vencido}`)
      .expect(401);
  });

  it('GET /auth/perfil con un token válido devuelve los datos del token', async () => {
    const token = await jwt.signAsync({
      sub: 2,
      nombre: 'Técnico de Prueba',
      rol: 'TECNICO',
    });
    return request(app.getHttpServer())
      .get('/auth/perfil')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ id: 2, nombre: 'Técnico de Prueba', rol: 'TECNICO' });
  });

  it('POST /auth/login sin datos responde 400 antes de consultar la base', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({})
      .expect(400);
  });
});
