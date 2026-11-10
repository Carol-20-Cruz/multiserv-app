import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EstadoOrden, Modalidad } from '../generated/prisma/enums';
import { ErrorValidacion } from '../logging/error-validacion';
import type { PrismaService } from '../prisma/prisma.service';
import type { CrearOrdenDto } from './dto/crear-orden.dto';
import {
  MENSAJE_ORDEN_ENTREGADA_NO_EDITA,
  OrdenesService,
} from './ordenes.service';
import { MENSAJES_COTIZACION } from './reglas/cotizacion';
import { MENSAJES_TRANSICION } from './reglas/estados';

// Prisma simulado (mock): un "actor" que hace de base de datos, para probar
// las decisiones del servicio sin conectarse a Supabase. $transaction
// ejecuta la función con el mismo actor, como si fuera la transacción.
function crearPrismaFalso() {
  const prisma = {
    cliente: { findUnique: jest.fn() },
    equipo: { findUnique: jest.fn() },
    usuario: { findUnique: jest.fn(), findMany: jest.fn() },
    configuracion: { upsert: jest.fn() },
    consecutivoOrden: { upsert: jest.fn() },
    ordenServicio: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    historialEstado: { create: jest.fn() },
    pago: { aggregate: jest.fn() },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) =>
    fn(prisma),
  );
  return prisma;
}

const USER_ID = 3;
const FALLA = 'No enciende y huele a quemado';
const DIAGNOSTICO = 'Fuente de poder dañada';

const dtoCrear: CrearOrdenDto = {
  clienteId: 10,
  equipoId: 20,
  fallaReportada: FALLA,
};

// Lee las líneas JSON que escribió el logger.
function logsEscritos(espia: jest.SpyInstance): Record<string, unknown>[] {
  return espia.mock.calls.map(
    ([linea]) => JSON.parse(String(linea)) as Record<string, unknown>,
  );
}
const eventos = (espia: jest.SpyInstance) =>
  logsEscritos(espia).map((l) => l.event);

// Pagos simulados de la orden: suma y cantidad.
const pagos = (total: number, cantidad: number) => ({
  _sum: { valor: cantidad === 0 ? null : total },
  _count: { _all: cantidad },
});

// Fila bloqueada que devuelve bloquearOrden (el primer update).
const filaBloqueada = (
  estado: EstadoOrden,
  valorCotizado: number | null = null,
) => ({ id: 5, estado, valorCotizado, porcentajeAbono: 50 });

describe('OrdenesService (Prisma simulado)', () => {
  let prisma: ReturnType<typeof crearPrismaFalso>;
  let servicio: OrdenesService;
  let salida: jest.SpyInstance;

  beforeEach(() => {
    prisma = crearPrismaFalso();
    servicio = new OrdenesService(prisma as unknown as PrismaService);
    salida = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  // Cliente y equipo válidos (el equipo es del cliente) y responsable activo.
  const datosValidos = () => {
    prisma.cliente.findUnique.mockResolvedValue({ id: 10, activo: true });
    prisma.equipo.findUnique.mockResolvedValue({
      id: 20,
      clienteId: 10,
      activo: true,
    });
    prisma.usuario.findUnique.mockResolvedValue({ id: USER_ID, activo: true });
    prisma.configuracion.upsert.mockResolvedValue({
      porcentajeAbono: 40,
      diasGarantia: 60,
    });
    prisma.ordenServicio.create.mockImplementation(
      ({ data }: { data: { numero: string } }) =>
        Promise.resolve({ id: 5, numero: data.numero, estado: 'RECIBIDO' }),
    );
  };

  // ---------- crear (SWR-ORD-001 + SWR-ORD-002 / AJ-06) ----------

  it('crear: número del año, configuración copiada, historial y log', async () => {
    // Arrange
    jest.useFakeTimers({ now: new Date('2026-11-09T15:00:00Z') });
    datosValidos();
    prisma.consecutivoOrden.upsert.mockResolvedValue({ ultimo: 7 });

    // Act
    const orden = await servicio.crear(dtoCrear, USER_ID);

    // Assert
    expect(orden).toEqual({
      id: 5,
      numero: 'MS-2026-00007',
      estado: 'RECIBIDO',
    });
    expect(prisma.consecutivoOrden.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { anio: 2026 },
        create: { anio: 2026, ultimo: 1 },
        update: { ultimo: { increment: 1 } },
      }),
    );
    // SWR-DATA-003: se copian los valores de Configuracion.
    expect(prisma.ordenServicio.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          porcentajeAbono: 40,
          diasGarantia: 60,
          responsableId: USER_ID, // por defecto, quien crea
          creadoPorId: USER_ID,
          modalidad: Modalidad.TALLER,
        }),
      }),
    );
    expect(prisma.historialEstado.create).toHaveBeenCalledWith({
      data: {
        ordenId: 5,
        estadoAnterior: null,
        estadoNuevo: EstadoOrden.RECIBIDO,
        usuarioId: USER_ID,
      },
    });
    expect(eventos(salida)).toEqual(['ORDER_CREATED']);
    expect(logsEscritos(salida)[0]).toMatchObject({
      metadata: {
        ordenId: 5,
        numero: 'MS-2026-00007',
        clienteId: 10,
        equipoId: 20,
        responsableId: USER_ID,
        userId: USER_ID,
      },
    });
  });

  // AJ-06: a medianoche de Colombia del 1/1 empieza el consecutivo del año nuevo.
  it('crear el 1/1/2027 a las 00:00 en Colombia: MS-2027-00001', async () => {
    // Arrange
    jest.useFakeTimers({ now: new Date('2027-01-01T05:00:00Z') });
    datosValidos();
    prisma.consecutivoOrden.upsert.mockResolvedValue({ ultimo: 1 });

    // Act
    const orden = await servicio.crear(dtoCrear, USER_ID);

    // Assert
    expect(prisma.consecutivoOrden.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { anio: 2027 } }),
    );
    expect(orden.numero).toBe('MS-2027-00001');
  });

  // Privacidad: el log no lleva la falla reportada.
  it('crear: el log no contiene la falla reportada', async () => {
    // Arrange
    datosValidos();
    prisma.consecutivoOrden.upsert.mockResolvedValue({ ultimo: 1 });

    // Act
    await servicio.crear(dtoCrear, USER_ID);

    // Assert
    const escrito = salida.mock.calls.map(([l]) => String(l)).join('');
    expect(escrito).not.toContain(FALLA);
  });

  // SWR-ORD-001: el equipo debe ser del cliente.
  it('crear con equipo de otro cliente: 400 y sin transacción', async () => {
    // Arrange
    datosValidos();
    prisma.equipo.findUnique.mockResolvedValue({
      id: 20,
      clienteId: 99,
      activo: true,
    });

    // Act
    const crear = servicio.crear(dtoCrear, USER_ID);

    // Assert
    await expect(crear).rejects.toThrow(
      new BadRequestException('El equipo no pertenece a este cliente'),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('crear para un cliente desactivado: 409', async () => {
    // Arrange
    datosValidos();
    prisma.cliente.findUnique.mockResolvedValue({ id: 10, activo: false });

    // Act
    const crear = servicio.crear(dtoCrear, USER_ID);

    // Assert
    await expect(crear).rejects.toBeInstanceOf(ConflictException);
  });

  it('crear con responsable inactivo: 400', async () => {
    // Arrange
    datosValidos();
    prisma.usuario.findUnique.mockResolvedValue({ id: 8, activo: false });

    // Act
    const crear = servicio.crear({ ...dtoCrear, responsableId: 8 }, USER_ID);

    // Assert
    await expect(crear).rejects.toThrow(
      new BadRequestException('El responsable no existe o está inactivo'),
    );
  });

  // En TALLER no se guarda una dirección de visita aunque llegue.
  it('crear en TALLER con dirección: la guarda como null', async () => {
    // Arrange
    datosValidos();
    prisma.consecutivoOrden.upsert.mockResolvedValue({ ultimo: 1 });

    // Act
    await servicio.crear(
      { ...dtoCrear, modalidad: Modalidad.TALLER, direccionVisita: 'Cra 5' },
      USER_ID,
    );

    // Assert
    expect(prisma.ordenServicio.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          direccionVisita: null,
          fechaVisita: null,
        }),
      }),
    );
  });

  // ---------- obtener: los bloqueos salen de las reglas puras ----------

  it('detalle en diagnóstico con cotización y sin pagos: bloqueo FALTA_ABONO', async () => {
    // Arrange
    prisma.ordenServicio.findUnique.mockResolvedValue({
      id: 5,
      estado: EstadoOrden.EN_DIAGNOSTICO,
      valorCotizado: 180001,
      porcentajeAbono: 50,
    });
    prisma.pago.aggregate.mockResolvedValue(pagos(0, 0));

    // Act
    const detalle = await servicio.obtener(5);

    // Assert
    expect(detalle).toMatchObject({
      totalPagado: 0,
      cantidadPagos: 0,
      abonoMinimo: 90001,
      siguienteEstado: EstadoOrden.EN_REPARACION,
      bloqueoSiguiente: {
        motivo: 'FALTA_ABONO',
        mensaje: MENSAJES_TRANSICION.FALTA_ABONO,
      },
      puedeCotizar: true,
      bloqueoCotizacion: null,
    });
  });

  // LISTO no ofrece "cambiar estado" (la entrega va por otra ruta).
  it('detalle en LISTO_PARA_ENTREGA: sin siguiente ni bloqueo', async () => {
    // Arrange
    prisma.ordenServicio.findUnique.mockResolvedValue({
      id: 5,
      estado: EstadoOrden.LISTO_PARA_ENTREGA,
      valorCotizado: 100000,
      porcentajeAbono: 50,
    });
    prisma.pago.aggregate.mockResolvedValue(pagos(50000, 1));

    // Act
    const detalle = await servicio.obtener(5);

    // Assert
    expect(detalle).toMatchObject({
      siguienteEstado: null,
      bloqueoSiguiente: null,
      puedeCotizar: false,
      bloqueoCotizacion: { motivo: 'ESTADO_NO_PERMITE' },
    });
  });

  it('detalle de una orden inexistente: 404', async () => {
    // Arrange
    prisma.ordenServicio.findUnique.mockResolvedValue(null);

    // Act
    const obtener = servicio.obtener(404);

    // Assert
    await expect(obtener).rejects.toBeInstanceOf(NotFoundException);
  });

  // ---------- actualizar ----------

  it('editar una orden entregada: 409', async () => {
    // Arrange
    prisma.ordenServicio.findUnique.mockResolvedValue({
      id: 5,
      estado: EstadoOrden.ENTREGADO,
      modalidad: Modalidad.TALLER,
      direccionVisita: null,
    });

    // Act
    const editar = servicio.actualizar(5, { accesorios: 'Control' }, USER_ID);

    // Assert
    await expect(editar).rejects.toThrow(
      new ConflictException(MENSAJE_ORDEN_ENTREGADA_NO_EDITA),
    );
  });

  // DOMICILIO exige dirección con el resultado final (lo guardado + lo nuevo).
  it('pasar a DOMICILIO sin dirección: 400 en direccionVisita', async () => {
    // Arrange
    prisma.ordenServicio.findUnique.mockResolvedValue({
      id: 5,
      estado: EstadoOrden.RECIBIDO,
      modalidad: Modalidad.TALLER,
      direccionVisita: null,
    });

    // Act
    const editar = servicio.actualizar(
      5,
      { modalidad: Modalidad.DOMICILIO },
      USER_ID,
    );

    // Assert
    await expect(editar).rejects.toBeInstanceOf(ErrorValidacion);
    await expect(editar).rejects.toMatchObject({ campos: ['direccionVisita'] });
    expect(prisma.ordenServicio.update).not.toHaveBeenCalled();
  });

  it('editar datos válidos: actualiza y registra ORDER_UPDATED', async () => {
    // Arrange
    prisma.ordenServicio.findUnique.mockResolvedValue({
      id: 5,
      estado: EstadoOrden.EN_REPARACION,
      modalidad: Modalidad.TALLER,
      direccionVisita: null,
    });
    prisma.ordenServicio.update.mockResolvedValue({ id: 5 });

    // Act
    await servicio.actualizar(5, { accesorios: 'Control remoto' }, USER_ID);

    // Assert
    expect(eventos(salida)).toEqual(['ORDER_UPDATED']);
    expect(logsEscritos(salida)[0]).toMatchObject({
      metadata: { ordenId: 5, userId: USER_ID },
    });
  });

  // ---------- registrarCotizacion (SWR-PAY-004 / AJ-09) ----------

  it('primera cotización: guarda valor y fecha; log con correccion false', async () => {
    // Arrange
    prisma.ordenServicio.update
      .mockResolvedValueOnce(filaBloqueada(EstadoOrden.EN_DIAGNOSTICO))
      .mockResolvedValueOnce({ id: 5, valorCotizado: 180000 });
    prisma.pago.aggregate.mockResolvedValue(pagos(0, 0));

    // Act
    await servicio.registrarCotizacion(
      5,
      { diagnostico: DIAGNOSTICO, valorCotizado: 180000 },
      USER_ID,
    );

    // Assert
    expect(prisma.ordenServicio.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: {
          diagnostico: DIAGNOSTICO,
          valorCotizado: 180000,
          aprobadaEn: expect.any(Date) as Date,
        },
      }),
    );
    expect(eventos(salida)).toEqual(['ORDER_QUOTE_SET']);
    expect(logsEscritos(salida)[0]).toMatchObject({
      metadata: {
        ordenId: 5,
        valorCotizado: 180000,
        valorAnterior: null,
        correccion: false,
        userId: USER_ID,
      },
    });
    // Privacidad: el diagnóstico no va al log.
    expect(String(salida.mock.calls[0][0])).not.toContain(DIAGNOSTICO);
  });

  // Respuesta 2 de la dueña: se corrige mientras no haya pagos.
  it('corregir sin pagos: log con valorAnterior y correccion true', async () => {
    // Arrange
    prisma.ordenServicio.update
      .mockResolvedValueOnce(filaBloqueada(EstadoOrden.EN_DIAGNOSTICO, 150000))
      .mockResolvedValueOnce({ id: 5, valorCotizado: 180000 });
    prisma.pago.aggregate.mockResolvedValue(pagos(0, 0));

    // Act
    await servicio.registrarCotizacion(
      5,
      { diagnostico: DIAGNOSTICO, valorCotizado: 180000 },
      USER_ID,
    );

    // Assert
    expect(logsEscritos(salida)[0]).toMatchObject({
      event: 'ORDER_QUOTE_SET',
      metadata: { valorAnterior: 150000, correccion: true },
    });
  });

  // Respuesta 2 de la dueña: con un pago el valor queda fijo.
  it('corregir con 1 pago: 409 TIENE_PAGOS, sin cambios y log WARN', async () => {
    // Arrange
    prisma.ordenServicio.update.mockResolvedValueOnce(
      filaBloqueada(EstadoOrden.EN_DIAGNOSTICO, 180000),
    );
    prisma.pago.aggregate.mockResolvedValue(pagos(90000, 1));

    // Act
    const corregir = servicio.registrarCotizacion(
      5,
      { diagnostico: DIAGNOSTICO, valorCotizado: 200000 },
      USER_ID,
    );

    // Assert
    await expect(corregir).rejects.toMatchObject({
      response: {
        statusCode: 409,
        message: MENSAJES_COTIZACION.TIENE_PAGOS,
        motivo: 'TIENE_PAGOS',
      },
    });
    expect(prisma.ordenServicio.update).toHaveBeenCalledTimes(1); // solo el candado
    expect(logsEscritos(salida)).toEqual([
      expect.objectContaining({
        level: 'WARN',
        event: 'ORDER_QUOTE_REJECTED',
        metadata: {
          ordenId: 5,
          motivo: 'TIENE_PAGOS',
          estado: EstadoOrden.EN_DIAGNOSTICO,
          cantidadPagos: 1,
          userId: USER_ID,
        },
      }),
    ]);
  });

  it('cotizar en RECIBIDO: 409 ESTADO_NO_PERMITE', async () => {
    // Arrange
    prisma.ordenServicio.update.mockResolvedValueOnce(
      filaBloqueada(EstadoOrden.RECIBIDO),
    );
    prisma.pago.aggregate.mockResolvedValue(pagos(0, 0));

    // Act
    const cotizar = servicio.registrarCotizacion(
      5,
      { diagnostico: DIAGNOSTICO, valorCotizado: 180000 },
      USER_ID,
    );

    // Assert
    await expect(cotizar).rejects.toMatchObject({
      response: { motivo: 'ESTADO_NO_PERMITE' },
    });
  });

  it('cotizar una orden inexistente: 404', async () => {
    // Arrange: Prisma lanza P2025 cuando el update no encuentra la fila.
    prisma.ordenServicio.update.mockRejectedValueOnce({ code: 'P2025' });

    // Act
    const cotizar = servicio.registrarCotizacion(
      404,
      { diagnostico: DIAGNOSTICO, valorCotizado: 180000 },
      USER_ID,
    );

    // Assert
    await expect(cotizar).rejects.toBeInstanceOf(NotFoundException);
  });

  // ---------- cambiarEstado (SWR-ORD-011 / AJ-07 / AJ-10) ----------

  it('RECIBIDO -> EN_DIAGNOSTICO: cambia, deja historial con comentario y log', async () => {
    // Arrange
    prisma.ordenServicio.update.mockResolvedValueOnce(
      filaBloqueada(EstadoOrden.RECIBIDO),
    );
    prisma.pago.aggregate.mockResolvedValue(pagos(0, 0));

    // Act
    const resultado = await servicio.cambiarEstado(
      5,
      { estadoNuevo: EstadoOrden.EN_DIAGNOSTICO, comentario: 'Se destapa' },
      USER_ID,
    );

    // Assert
    expect(resultado).toEqual({ id: 5, estado: EstadoOrden.EN_DIAGNOSTICO });
    expect(prisma.ordenServicio.update).toHaveBeenLastCalledWith({
      where: { id: 5 },
      data: { estado: EstadoOrden.EN_DIAGNOSTICO },
    });
    expect(prisma.historialEstado.create).toHaveBeenCalledWith({
      data: {
        ordenId: 5,
        estadoAnterior: EstadoOrden.RECIBIDO,
        estadoNuevo: EstadoOrden.EN_DIAGNOSTICO,
        usuarioId: USER_ID,
        comentario: 'Se destapa',
      },
    });
    expect(logsEscritos(salida)).toEqual([
      expect.objectContaining({
        event: 'ORDER_STATUS_CHANGED',
        metadata: {
          ordenId: 5,
          de: EstadoOrden.RECIBIDO,
          a: EstadoOrden.EN_DIAGNOSTICO,
          userId: USER_ID,
        },
      }),
    ]);
  });

  // AJ-10 (frontera): 90.000 pagados de 90.001 mínimos.
  it('a reparación con abono insuficiente: 409 FALTA_ABONO con montos en el log', async () => {
    // Arrange
    prisma.ordenServicio.update.mockResolvedValueOnce(
      filaBloqueada(EstadoOrden.EN_DIAGNOSTICO, 180001),
    );
    prisma.pago.aggregate.mockResolvedValue(pagos(90000, 1));

    // Act
    const cambiar = servicio.cambiarEstado(
      5,
      { estadoNuevo: EstadoOrden.EN_REPARACION },
      USER_ID,
    );

    // Assert
    await expect(cambiar).rejects.toMatchObject({
      response: {
        statusCode: 409,
        message: MENSAJES_TRANSICION.FALTA_ABONO,
        motivo: 'FALTA_ABONO',
      },
    });
    expect(prisma.historialEstado.create).not.toHaveBeenCalled();
    expect(logsEscritos(salida)).toEqual([
      expect.objectContaining({
        level: 'WARN',
        event: 'ORDER_TRANSITION_REJECTED',
        metadata: {
          ordenId: 5,
          motivo: 'FALTA_ABONO',
          de: EstadoOrden.EN_DIAGNOSTICO,
          a: EstadoOrden.EN_REPARACION,
          abonoMinimo: 90001,
          totalPagado: 90000,
          userId: USER_ID,
        },
      }),
    ]);
  });

  // AJ-10 (frontera): con exactamente el mínimo sí pasa.
  it('a reparación con 90001 de 90001: pasa a EN_REPARACION', async () => {
    // Arrange
    prisma.ordenServicio.update.mockResolvedValueOnce(
      filaBloqueada(EstadoOrden.EN_DIAGNOSTICO, 180001),
    );
    prisma.pago.aggregate.mockResolvedValue(pagos(90001, 1));

    // Act
    const resultado = await servicio.cambiarEstado(
      5,
      { estadoNuevo: EstadoOrden.EN_REPARACION },
      USER_ID,
    );

    // Assert
    expect(resultado.estado).toBe(EstadoOrden.EN_REPARACION);
    expect(eventos(salida)).toEqual(['ORDER_STATUS_CHANGED']);
  });

  // AJ-09: sin cotización no hay reparación; el log no lleva montos.
  it('a reparación sin cotización: 409 FALTA_VALOR_COTIZADO', async () => {
    // Arrange
    prisma.ordenServicio.update.mockResolvedValueOnce(
      filaBloqueada(EstadoOrden.EN_DIAGNOSTICO),
    );
    prisma.pago.aggregate.mockResolvedValue(pagos(0, 0));

    // Act
    const cambiar = servicio.cambiarEstado(
      5,
      { estadoNuevo: EstadoOrden.EN_REPARACION },
      USER_ID,
    );

    // Assert
    await expect(cambiar).rejects.toMatchObject({
      response: { motivo: 'FALTA_VALOR_COTIZADO' },
    });
    expect(logsEscritos(salida)[0].metadata).not.toHaveProperty('abonoMinimo');
  });

  // Doble clic: el segundo pedido ya ve el estado nuevo (fila bloqueada).
  it('segundo clic al mismo estado: 409 MISMO_ESTADO', async () => {
    // Arrange
    prisma.ordenServicio.update.mockResolvedValueOnce(
      filaBloqueada(EstadoOrden.EN_DIAGNOSTICO),
    );
    prisma.pago.aggregate.mockResolvedValue(pagos(0, 0));

    // Act
    const cambiar = servicio.cambiarEstado(
      5,
      { estadoNuevo: EstadoOrden.EN_DIAGNOSTICO },
      USER_ID,
    );

    // Assert
    await expect(cambiar).rejects.toMatchObject({
      response: { motivo: 'MISMO_ESTADO' },
    });
  });

  // SWR-ENT-003: la entrega no se hace con "cambiar estado".
  it('LISTO -> ENTREGADO por cambiar estado: 409 ENTREGA_POR_OTRA_RUTA', async () => {
    // Arrange
    prisma.ordenServicio.update.mockResolvedValueOnce(
      filaBloqueada(EstadoOrden.LISTO_PARA_ENTREGA, 100000),
    );
    prisma.pago.aggregate.mockResolvedValue(pagos(100000, 2));

    // Act
    const cambiar = servicio.cambiarEstado(
      5,
      { estadoNuevo: EstadoOrden.ENTREGADO },
      USER_ID,
    );

    // Assert
    await expect(cambiar).rejects.toBeInstanceOf(ConflictException);
    await expect(cambiar).rejects.toMatchObject({
      response: { motivo: 'ENTREGA_POR_OTRA_RUTA' },
    });
  });
});
