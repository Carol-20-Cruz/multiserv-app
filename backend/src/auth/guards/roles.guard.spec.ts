import {
  Controller,
  Get,
  HttpCode,
  INestApplication,
  Post,
  UseGuards,
} from '@nestjs/common';
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

  @Get('repuestos/:id')
  @Roles(...PERMISOS.repuestos)
  repuestos() {
    return { ok: true };
  }

  @Post('ordenes/:id/estado')
  @HttpCode(200)
  @Roles(...PERMISOS.ordenes)
  cambiarEstadoOrden() {
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

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    await app.close();
  });

  // SWR-AUTH-008 / AJ-03: Técnico NO puede administrar usuarios -> 403.
  it('Técnico en ruta solo Dueño: responde 403', async () => {
    // Arrange
    const token = tokenDe(Rol.TECNICO);
    jest.spyOn(process.stdout, 'write').mockImplementationOnce(() => true); // ACCESS_DENIED

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

  // AJ-03 + validación con la dueña: el Técnico registra órdenes (y, en la
  // Entrega B, pagos). Tanto el Dueño como el Técnico pasan el portero.
  it.each([Rol.TECNICO, Rol.DUENO])(
    '%s en órdenes (cambiar estado): responde 200',
    async (rol) => {
      // Arrange
      const token = tokenDe(rol);

      // Act
      const res = await request(app.getHttpServer())
        .post('/prueba/ordenes/5/estado')
        .set('Authorization', `Bearer ${token}`);

      // Assert
      expect(res.status).toBe(200);
    },
  );

  // AJ-03: inventario es solo del Dueño. El Técnico recibe 403 y queda
  // ACCESS_DENIED con el patrón de la ruta, sin la URL real ni su búsqueda.
  it('Técnico en repuestos: 403 y log ACCESS_DENIED sin datos de la petición', async () => {
    // Arrange
    const token = tokenDe(Rol.TECNICO);
    const salida = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);

    // Act
    const res = await request(app.getHttpServer())
      .get('/prueba/repuestos/15?buscar=tarjeta')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    const logs = salida.mock.calls.map(
      ([linea]) => JSON.parse(String(linea)) as Record<string, unknown>,
    );
    salida.mockRestore();
    expect(res.status).toBe(403);
    expect(logs).toEqual([
      expect.objectContaining({
        level: 'WARN',
        event: 'ACCESS_DENIED',
        metadata: {
          userId: 1,
          rol: 'TECNICO',
          method: 'GET',
          ruta: '/prueba/repuestos/:id',
        },
      }),
    ]);
    expect(JSON.stringify(logs)).not.toContain('tarjeta');
  });

  // AJ-03: el Dueño sí entra a repuestos.
  it('Dueño en repuestos: responde 200', async () => {
    // Arrange
    const token = tokenDe(Rol.DUENO);

    // Act
    const res = await request(app.getHttpServer())
      .get('/prueba/repuestos/15')
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
