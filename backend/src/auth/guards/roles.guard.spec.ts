import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Rol } from '../../generated/prisma/enums';
import { Roles } from '../decorators/roles.decorator';
import { PERMISOS } from '../reglas/permisos';
import type { PayloadJwt } from '../usuario-autenticado';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

// Rutas de prueba que solo existen en este test, para ejercitar los guards
// reales de NestJS (decorador + Reflector + JwtAuthGuard + RolesGuard).
@Controller('prueba')
@UseGuards(JwtAuthGuard, RolesGuard)
class RutasDePruebaController {
  @Get('solo-dueno')
  @Roles(...PERMISOS.usuarios)
  soloDueno() {
    return { ok: true };
  }

  @Get('clientes')
  @Roles(...PERMISOS.clientes)
  clientes() {
    return { ok: true };
  }
}

describe('RolesGuard dentro de NestJS', () => {
  let app: INestApplication;
  let jwt: JwtService;

  const tokenDe = (rol: Rol) => {
    const payload: PayloadJwt = { sub: 1, nombre: 'Prueba', rol };
    return jwt.sign(payload);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'secreto-solo-para-tests' })],
      controllers: [RutasDePruebaController],
      providers: [JwtAuthGuard, RolesGuard],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  // SWR-AUTH-008 / AJ-03: Técnico NO puede administrar usuarios -> 403.
  it('Técnico en ruta solo Dueño: responde 403', async () => {
    // Arrange
    const token = tokenDe(Rol.TECNICO);

    // Act
    const res = await request(app.getHttpServer())
      .get('/prueba/solo-dueno')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('No tiene permisos para esta operación');
  });

  // SWR-AUTH-008 / AJ-03: Dueño puede todo -> 200.
  it('Dueño en ruta solo Dueño: responde 200', async () => {
    // Arrange
    const token = tokenDe(Rol.DUENO);

    // Act
    const res = await request(app.getHttpServer())
      .get('/prueba/solo-dueno')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(res.status).toBe(200);
  });

  // SWR-AUTH-008 / AJ-03: Técnico sí puede clientes -> 200.
  it('Técnico en ruta de clientes: responde 200', async () => {
    // Arrange
    const token = tokenDe(Rol.TECNICO);

    // Act
    const res = await request(app.getHttpServer())
      .get('/prueba/clientes')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(res.status).toBe(200);
  });

  // SWR-AUTH-008: sin token no se llega a revisar el rol -> 401.
  it('sin token: responde 401', async () => {
    // Arrange
    const ruta = '/prueba/solo-dueno';

    // Act
    const res = await request(app.getHttpServer()).get(ruta);

    // Assert
    expect(res.status).toBe(401);
  });
});
