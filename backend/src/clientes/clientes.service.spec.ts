import { BadRequestException, ConflictException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import {
  ClientesService,
  MENSAJE_TELEFONO_DUPLICADO,
} from './clientes.service';
import type { CrearClienteDto } from './dto/crear-cliente.dto';

// Prisma simulado (mock): un "actor" que hace de base de datos, para probar
// las decisiones del servicio sin conectarse a Supabase.
function crearPrismaFalso() {
  return {
    cliente: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    tipoEquipo: { findUnique: jest.fn() },
    equipo: { create: jest.fn() },
  };
}

const USER_ID = 7;
const dto: CrearClienteDto = {
  nombre: 'Ana Gómez',
  telefono: '3001234567',
  autorizaDatos: true,
};
const existente = {
  id: 42,
  nombre: 'Pedro Ruiz',
  telefono: '3001234567',
  activo: true,
};

// Lee las líneas JSON que escribió el logger.
function logsEscritos(espia: jest.SpyInstance): Record<string, unknown>[] {
  return espia.mock.calls.map(
    ([linea]) => JSON.parse(String(linea)) as Record<string, unknown>,
  );
}

describe('ClientesService (Prisma simulado)', () => {
  let prisma: ReturnType<typeof crearPrismaFalso>;
  let servicio: ClientesService;
  let salida: jest.SpyInstance;

  beforeEach(() => {
    prisma = crearPrismaFalso();
    servicio = new ClientesService(prisma as unknown as PrismaService);
    salida = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => jest.restoreAllMocks());

  // SWR-CLI-004 + AJ-04: si el teléfono existe se IMPIDE el registro y se
  // devuelven los datos básicos del cliente existente (409).
  it('teléfono duplicado: 409 con el cliente existente y no crea nada', async () => {
    // Arrange
    prisma.cliente.findUnique.mockResolvedValue(existente);

    // Act
    const promesa = servicio.crear(dto, USER_ID);

    // Assert
    await expect(promesa).rejects.toBeInstanceOf(ConflictException);
    const error = (await promesa.catch((e: unknown) => e)) as ConflictException;
    expect(error.getStatus()).toBe(409);
    expect(error.getResponse()).toEqual({
      statusCode: 409,
      message: MENSAJE_TELEFONO_DUPLICADO,
      cliente: existente,
    });
    expect(prisma.cliente.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { telefono: '3001234567' } }),
    );
    expect(prisma.cliente.create).not.toHaveBeenCalled();
  });

  // SWR-CLI-004 + logs sin datos personales: WARN con ids, sin nombre ni teléfono.
  it('teléfono duplicado: registra CLIENT_DUPLICATE_PHONE solo con ids', async () => {
    // Arrange
    prisma.cliente.findUnique.mockResolvedValue(existente);

    // Act
    await servicio.crear(dto, USER_ID).catch(() => undefined);

    // Assert
    const [log] = logsEscritos(salida);
    expect(log).toMatchObject({
      level: 'WARN',
      event: 'CLIENT_DUPLICATE_PHONE',
      metadata: { clienteExistenteId: 42, userId: USER_ID, origen: 'REGISTRO' },
    });
    const texto = JSON.stringify(log);
    expect(texto).not.toContain('3001234567');
    expect(texto).not.toContain('Pedro');
  });

  // SWR-CLI-004 + AJ-04: la verificación previa (al salir del campo) también
  // deja rastro del duplicado, porque el formulario ya no enviará el POST.
  it('verificar teléfono existente: lo devuelve y registra origen VERIFICACION', async () => {
    // Arrange
    prisma.cliente.findUnique.mockResolvedValue(existente);

    // Act
    const encontrado = await servicio.verificarTelefono('3001234567', USER_ID);

    // Assert
    expect(encontrado).toEqual(existente);
    expect(logsEscritos(salida)[0]).toMatchObject({
      level: 'WARN',
      event: 'CLIENT_DUPLICATE_PHONE',
      metadata: {
        clienteExistenteId: 42,
        userId: USER_ID,
        origen: 'VERIFICACION',
      },
    });
  });

  // SWR-CLI-004: al editar, el propio teléfono del cliente no es duplicado.
  it('verificar el teléfono del mismo cliente (excluir): no es duplicado ni se registra', async () => {
    // Arrange
    prisma.cliente.findUnique.mockResolvedValue(existente);

    // Act
    const encontrado = await servicio.verificarTelefono(
      '3001234567',
      USER_ID,
      42,
    );

    // Assert
    expect(encontrado).toBeNull();
    expect(salida).not.toHaveBeenCalled();
  });

  // SWR-CLI-001 + Ley 1581: teléfono libre -> se crea con la autorización y
  // la fecha del servidor; se registra CLIENT_CREATED.
  it('teléfono libre: crea el cliente con fechaAutorizacion del servidor', async () => {
    // Arrange
    prisma.cliente.findUnique.mockResolvedValue(null);
    prisma.cliente.create.mockResolvedValue({ ...existente, id: 99 });
    const antes = Date.now();

    // Act
    const creado = await servicio.crear(dto, USER_ID);

    // Assert
    expect(creado.id).toBe(99);
    const { data } = prisma.cliente.create.mock.calls[0][0] as {
      data: { autorizaDatos: boolean; fechaAutorizacion: Date };
    };
    expect(data.autorizaDatos).toBe(true);
    expect(data.fechaAutorizacion.getTime()).toBeGreaterThanOrEqual(antes);
    expect(logsEscritos(salida)[0]).toMatchObject({
      level: 'INFO',
      event: 'CLIENT_CREATED',
      metadata: { clienteId: 99, userId: USER_ID },
    });
  });

  // SWR-CLI-004 + AJ-04 (carrera): dos registros simultáneos; el segundo
  // choca con el @unique (P2002) y también recibe 409 con el existente.
  it('registro simultáneo (P2002): responde 409 con el cliente existente', async () => {
    // Arrange
    prisma.cliente.findUnique
      .mockResolvedValueOnce(null) // la primera revisión no lo ve
      .mockResolvedValueOnce(existente); // tras el choque ya existe
    prisma.cliente.create.mockRejectedValue({ code: 'P2002' });

    // Act
    const promesa = servicio.crear(dto, USER_ID);

    // Assert
    await expect(promesa).rejects.toMatchObject({
      response: { statusCode: 409, cliente: existente },
    });
  });

  // SWR-CLI-004: al editar, cambiar a un teléfono de OTRO cliente se impide.
  it('editar con teléfono de otro cliente: 409 y no actualiza', async () => {
    // Arrange
    prisma.cliente.findUnique
      .mockResolvedValueOnce({ ...existente, id: 5, telefono: '3109998877' })
      .mockResolvedValueOnce(existente);

    // Act
    const promesa = servicio.actualizar(5, { telefono: '3001234567' }, USER_ID);

    // Assert
    await expect(promesa).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.cliente.update).not.toHaveBeenCalled();
  });

  // SWR-EQP-003: no se asocian equipos con un tipo inexistente.
  it('agregar equipo con tipo inexistente: 400 y no crea', async () => {
    // Arrange
    prisma.cliente.findUnique.mockResolvedValue(existente);
    prisma.tipoEquipo.findUnique.mockResolvedValue(null);

    // Act
    const promesa = servicio.agregarEquipo(
      42,
      { tipoEquipoId: 999, marca: 'LG' },
      USER_ID,
    );

    // Assert
    await expect(promesa).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.equipo.create).not.toHaveBeenCalled();
  });

  // SWR-EQP-003: equipo válido -> se crea y se registra EQUIPMENT_ADDED.
  it('agregar equipo válido: crea y registra EQUIPMENT_ADDED', async () => {
    // Arrange
    prisma.cliente.findUnique.mockResolvedValue(existente);
    prisma.tipoEquipo.findUnique.mockResolvedValue({ id: 1, activo: true });
    prisma.equipo.create.mockResolvedValue({ id: 15 });

    // Act
    await servicio.agregarEquipo(42, { tipoEquipoId: 1, marca: 'LG' }, USER_ID);

    // Assert
    expect(prisma.equipo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { tipoEquipoId: 1, marca: 'LG', clienteId: 42 },
      }),
    );
    expect(logsEscritos(salida)[0]).toMatchObject({
      level: 'INFO',
      event: 'EQUIPMENT_ADDED',
      metadata: { equipoId: 15, clienteId: 42, userId: USER_ID },
    });
  });
});
