import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { CrearRepuestoDto } from './dto/crear-repuesto.dto';
import {
  InventarioService,
  MENSAJE_REFERENCIA_DESACTIVADA,
  MENSAJE_REFERENCIA_DUPLICADA,
  MOTIVO_STOCK_INICIAL,
} from './inventario.service';

// Marca que hace de "referencia a la columna cantidadMinima" de Prisma.
const CAMPO_MINIMO = { campo: 'cantidadMinima' };

// Prisma simulado (mock): un "actor" que hace de base de datos, para probar
// las decisiones del servicio sin conectarse a Supabase. $transaction
// ejecuta la función con el mismo actor, como si fuera la transacción.
function crearPrismaFalso() {
  const prisma = {
    repuesto: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      fields: { cantidadMinima: CAMPO_MINIMO },
    },
    movimientoInventario: { create: jest.fn() },
    tipoEquipo: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) =>
    fn(prisma),
  );
  return prisma;
}

const USER_ID = 3;
const TIPO = { id: 2, nombre: 'Lavadora', activo: true };

const dto: CrearRepuestoDto = {
  nombre: 'Tarjeta principal',
  referencia: 'BN44-00932A',
  marcaCompatible: 'Samsung',
  tipoEquipoId: 2,
  precioVenta: 180000,
  cantidadInicial: 10,
  cantidadMinima: 2,
};

// Lo que devuelve la base tras crear o actualizar.
const repuestoBase = {
  id: 15,
  nombre: 'Tarjeta principal',
  referencia: 'BN44-00932A',
  marcaCompatible: 'Samsung',
  cantidad: 10,
  cantidadMinima: 2,
  precioVenta: 180000,
  activo: true,
  tipoEquipo: { id: 2, nombre: 'Lavadora' },
};

// Lee las líneas JSON que escribió el logger.
function logsEscritos(espia: jest.SpyInstance): Record<string, unknown>[] {
  return espia.mock.calls.map(
    ([linea]) => JSON.parse(String(linea)) as Record<string, unknown>,
  );
}
const eventos = (espia: jest.SpyInstance) =>
  logsEscritos(espia).map((l) => l.event);

describe('InventarioService (Prisma simulado)', () => {
  let prisma: ReturnType<typeof crearPrismaFalso>;
  let servicio: InventarioService;
  let salida: jest.SpyInstance;

  beforeEach(() => {
    prisma = crearPrismaFalso();
    servicio = new InventarioService(prisma as unknown as PrismaService);
    salida = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => jest.restoreAllMocks());

  // ---------- crear (SWR-INV-001 + AJ-05) ----------

  // SWR-INV-001: el stock inicial queda como movimiento ENTRADA "Stock inicial".
  it('crear con stock inicial: registra el movimiento ENTRADA y los logs', async () => {
    // Arrange
    prisma.tipoEquipo.findUnique.mockResolvedValue(TIPO);
    prisma.repuesto.findUnique.mockResolvedValue(null);
    prisma.repuesto.create.mockResolvedValue(repuestoBase);
    prisma.movimientoInventario.create.mockResolvedValue({ id: 99 });

    // Act
    const creado = await servicio.crear(dto, USER_ID);

    // Assert
    expect(prisma.repuesto.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cantidad: 10, tipoEquipoId: 2 }),
      }),
    );
    expect(prisma.movimientoInventario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          repuestoId: 15,
          tipo: 'ENTRADA',
          cantidad: 10,
          saldoResultante: 10,
          motivo: MOTIVO_STOCK_INICIAL,
          usuarioId: USER_ID,
        },
      }),
    );
    expect(creado.stockBajo).toBe(false);
    expect(eventos(salida)).toEqual(['PART_CREATED', 'STOCK_ENTRY']);
    expect(logsEscritos(salida)[1]).toMatchObject({
      metadata: { repuestoId: 15, movimientoId: 99, cantidad: 10 },
    });
  });

  // SWR-INV-009: creado con stock 0 (mínimo 1) -> nace en existencia baja.
  it('crear con stock 0: sin movimiento y con STOCK_LOW origen CREACION', async () => {
    // Arrange
    prisma.tipoEquipo.findUnique.mockResolvedValue(TIPO);
    prisma.repuesto.findUnique.mockResolvedValue(null);
    prisma.repuesto.create.mockResolvedValue({
      ...repuestoBase,
      cantidad: 0,
      cantidadMinima: 1,
    });

    // Act
    const creado = await servicio.crear(
      { ...dto, cantidadInicial: 0, cantidadMinima: undefined },
      USER_ID,
    );

    // Assert
    expect(prisma.movimientoInventario.create).not.toHaveBeenCalled();
    expect(creado.stockBajo).toBe(true);
    const alerta = logsEscritos(salida).find((l) => l.event === 'STOCK_LOW');
    expect(alerta).toMatchObject({
      level: 'WARN',
      metadata: {
        repuestoId: 15,
        cantidad: 0,
        cantidadMinima: 1,
        origen: 'CREACION',
        userId: USER_ID,
      },
    });
  });

  // Referencia única: si existe y está activo -> 409 sin crear.
  it('referencia de un repuesto activo: 409 y no crea nada', async () => {
    // Arrange
    prisma.tipoEquipo.findUnique.mockResolvedValue(TIPO);
    prisma.repuesto.findUnique.mockResolvedValue({ id: 8, activo: true });

    // Act
    const error = await servicio.crear(dto, USER_ID).catch((e: unknown) => e);

    // Assert
    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).message).toBe(
      MENSAJE_REFERENCIA_DUPLICADA,
    );
    expect(prisma.repuesto.create).not.toHaveBeenCalled();
    expect(logsEscritos(salida)[0]).toMatchObject({
      level: 'WARN',
      event: 'PART_DUPLICATE_REFERENCE',
      metadata: { repuestoExistenteId: 8, activo: true, userId: USER_ID },
    });
  });

  // Respuesta 5 de la dueña: si está desactivado, mensaje propio y sin reactivar.
  it('referencia de un repuesto desactivado: 409 con mensaje propio', async () => {
    // Arrange
    prisma.tipoEquipo.findUnique.mockResolvedValue(TIPO);
    prisma.repuesto.findUnique.mockResolvedValue({ id: 8, activo: false });

    // Act
    const error = await servicio.crear(dto, USER_ID).catch((e: unknown) => e);

    // Assert
    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).message).toBe(
      MENSAJE_REFERENCIA_DESACTIVADA,
    );
    expect(prisma.repuesto.update).not.toHaveBeenCalled();
  });

  // AJ-05: el tipo de equipo debe existir y estar activo.
  it.each([null, { ...TIPO, activo: false }])(
    'tipo de equipo %p: 400 y no crea nada',
    async (tipo) => {
      // Arrange
      prisma.tipoEquipo.findUnique.mockResolvedValue(tipo);

      // Act
      const promesa = servicio.crear(dto, USER_ID);

      // Assert
      await expect(promesa).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.repuesto.create).not.toHaveBeenCalled();
    },
  );

  // Logs sin datos del repuesto: solo ids y cantidades.
  it('los logs no llevan nombre ni referencia del repuesto', async () => {
    // Arrange
    prisma.tipoEquipo.findUnique.mockResolvedValue(TIPO);
    prisma.repuesto.findUnique.mockResolvedValue(null);
    prisma.repuesto.create.mockResolvedValue(repuestoBase);
    prisma.movimientoInventario.create.mockResolvedValue({ id: 99 });

    // Act
    await servicio.crear(dto, USER_ID);

    // Assert
    const texto = JSON.stringify(logsEscritos(salida));
    expect(texto).not.toContain('Tarjeta');
    expect(texto).not.toContain('BN44');
  });

  // ---------- actualizar ----------

  // SWR-INV-009: subir el mínimo por encima del stock enciende la alerta.
  it('subir el mínimo de 2 a 12 con 10 unidades: STOCK_LOW origen EDICION', async () => {
    // Arrange
    prisma.repuesto.findUnique.mockResolvedValue(repuestoBase);
    prisma.repuesto.update.mockResolvedValue({
      ...repuestoBase,
      cantidadMinima: 12,
    });

    // Act
    const actualizado = await servicio.actualizar(
      15,
      { cantidadMinima: 12 },
      USER_ID,
    );

    // Assert
    expect(actualizado.stockBajo).toBe(true);
    expect(eventos(salida)).toEqual(['PART_UPDATED', 'STOCK_LOW']);
    expect(logsEscritos(salida)[1]).toMatchObject({
      metadata: { origen: 'EDICION', cantidad: 10, cantidadMinima: 12 },
    });
  });

  // SWR-INV-009: si ya estaba bajo, editar no repite la alerta.
  it('editar un repuesto que ya estaba bajo: no repite STOCK_LOW', async () => {
    // Arrange
    const bajo = { ...repuestoBase, cantidad: 1, cantidadMinima: 2 };
    prisma.repuesto.findUnique.mockResolvedValue(bajo);
    prisma.repuesto.update.mockResolvedValue({ ...bajo, precioVenta: 1 });

    // Act
    await servicio.actualizar(15, { precioVenta: 1 }, USER_ID);

    // Assert
    expect(eventos(salida)).toEqual(['PART_UPDATED']);
  });

  it('editar un repuesto desactivado: 409 sin actualizar', async () => {
    // Arrange
    prisma.repuesto.findUnique.mockResolvedValue({
      ...repuestoBase,
      activo: false,
    });

    // Act
    const promesa = servicio.actualizar(15, { nombre: 'Otro' }, USER_ID);

    // Assert
    await expect(promesa).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.repuesto.update).not.toHaveBeenCalled();
  });

  // ---------- registrar entrada ----------

  // La entrada suma con increment y deja el saldo resultante en el movimiento.
  it('entrada de 3 con 1 unidad: suma, guarda el saldo y registra STOCK_ENTRY', async () => {
    // Arrange
    prisma.repuesto.findUnique.mockResolvedValue({
      ...repuestoBase,
      cantidad: 1,
      cantidadMinima: 5,
    });
    prisma.repuesto.update.mockResolvedValue({
      ...repuestoBase,
      cantidad: 4,
      cantidadMinima: 5,
    });
    prisma.movimientoInventario.create.mockResolvedValue({ id: 120 });

    // Act
    const resultado = await servicio.registrarEntrada(
      15,
      { cantidad: 3, proveedor: 'Distribuidora Sur' },
      USER_ID,
    );

    // Assert
    expect(prisma.repuesto.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { cantidad: { increment: 3 } } }),
    );
    expect(prisma.movimientoInventario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tipo: 'ENTRADA',
          cantidad: 3,
          saldoResultante: 4,
          proveedor: 'Distribuidora Sur',
        }),
      }),
    );
    // Sigue bajo (4 <= 5): se ve en pantalla, pero no se repite STOCK_LOW.
    expect(resultado.stockBajo).toBe(true);
    expect(eventos(salida)).toEqual(['STOCK_ENTRY']);
    expect(JSON.stringify(logsEscritos(salida))).not.toContain('Distribuidora');
  });

  it('entrada en un repuesto desactivado: 409 sin tocar el stock', async () => {
    // Arrange
    prisma.repuesto.findUnique.mockResolvedValue({
      ...repuestoBase,
      activo: false,
    });

    // Act
    const promesa = servicio.registrarEntrada(15, { cantidad: 3 }, USER_ID);

    // Assert
    await expect(promesa).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('entrada en un repuesto que no existe: 404', async () => {
    // Arrange
    prisma.repuesto.findUnique.mockResolvedValue(null);

    // Act
    const promesa = servicio.registrarEntrada(999, { cantidad: 3 }, USER_ID);

    // Assert
    await expect(promesa).rejects.toBeInstanceOf(NotFoundException);
  });

  // ---------- desactivar y listar ----------

  // Se desactiva, nunca se borra.
  it('desactivar: pone activo en false y registra PART_DEACTIVATED', async () => {
    // Arrange
    prisma.repuesto.findUnique.mockResolvedValue(repuestoBase);
    prisma.repuesto.update.mockResolvedValue({
      ...repuestoBase,
      activo: false,
    });

    // Act
    const resultado = await servicio.desactivar(15, USER_ID);

    // Assert
    expect(prisma.repuesto.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 15 }, data: { activo: false } }),
    );
    expect(resultado.activo).toBe(false);
    expect(logsEscritos(salida)[0]).toMatchObject({
      event: 'PART_DEACTIVATED',
      metadata: { repuestoId: 15, userId: USER_ID },
    });
  });

  // SWR-INV-009: el filtro compara cantidad <= cantidadMinima en la base.
  it('buscar solo stock bajo: filtra activos con cantidad <= mínimo', async () => {
    // Arrange
    prisma.repuesto.findMany.mockResolvedValue([
      { ...repuestoBase, cantidad: 2, cantidadMinima: 2 },
    ]);
    prisma.repuesto.count.mockResolvedValue(1);

    // Act
    const pagina = await servicio.buscar({ soloStockBajo: true });

    // Assert
    expect(prisma.repuesto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { activo: true, cantidad: { lte: CAMPO_MINIMO } },
      }),
    );
    expect(pagina.total).toBe(1);
    expect(pagina.datos[0].stockBajo).toBe(true);
  });

  // Defecto 7: "desague" encuentra "Bomba de desagüe" (nombreBusqueda =
  // "bomba de desague"); la referencia sigue con ILIKE (es un código).
  it('buscar "Desagüe": nombre sin tildes y referencia sin distinguir mayúsculas', async () => {
    // Arrange
    prisma.repuesto.findMany.mockResolvedValue([]);
    prisma.repuesto.count.mockResolvedValue(0);

    // Act
    await servicio.buscar({ buscar: 'Desagüe' });

    // Assert
    expect(prisma.repuesto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          activo: true,
          OR: [
            { nombreBusqueda: { contains: 'desague' } },
            { referencia: { contains: 'Desagüe', mode: 'insensitive' } },
          ],
        },
      }),
    );
  });
});
