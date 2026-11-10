import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { EstadoOrden, Modalidad } from '../generated/prisma/enums';
import { textoBusqueda } from '../comun/texto-busqueda';
import { ErrorValidacion } from '../logging/error-validacion';
import { JsonLogger } from '../logging/json-logger';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarOrdenDto } from './dto/actualizar-orden.dto';
import { BuscarOrdenesDto } from './dto/buscar-ordenes.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import {
  CrearOrdenDto,
  MENSAJE_DIRECCION_DOMICILIO,
} from './dto/crear-orden.dto';
import { EntregarOrdenDto } from './dto/entregar-orden.dto';
import { RegistrarCotizacionDto } from './dto/registrar-cotizacion.dto';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { abonoMinimo } from './reglas/abono';
import { evaluarCotizacion } from './reglas/cotizacion';
import {
  evaluarTransicion,
  siguientePorCambioDeEstado,
} from './reglas/estados';
import { anioColombia, formatearNumeroOrden } from './reglas/numero-orden';
import {
  calcularSaldo,
  puedeEntregar,
  tipoPago,
  validarPago,
  vencimientoGarantia,
} from './reglas/saldo';

// Error de Prisma por registro inexistente en un update.
const esNoEncontrado = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === 'P2025';

// Una regla de negocio dijo "no" DENTRO de una transacción. Lanzarlo la
// deshace (y suelta el candado); afuera se registra el log WARN y se
// responde 409 con el mensaje y el motivo (la pantalla puede usar ambos).
export class RechazoNegocio extends Error {
  constructor(
    readonly motivo: string,
    mensaje: string,
    readonly datos: Record<string, unknown>,
  ) {
    super(mensaje);
  }

  comoConflicto() {
    return new ConflictException({
      statusCode: 409,
      message: this.message,
      motivo: this.motivo,
      error: 'Conflict',
    });
  }
}

export const ORDENES_POR_PAGINA = 10;
export const MENSAJE_ORDEN_ENTREGADA_NO_EDITA =
  'No se puede editar una orden entregada';

// Pesos colombianos sin decimales: 125000 -> "$ 125.000".
export const formatearPesos = (valor: number) =>
  `$ ${valor.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;

// SWR-ENT-003: por qué no se puede entregar (respuesta 409).
export const MENSAJES_ENTREGA = {
  YA_ENTREGADO: 'La orden ya fue entregada',
  NO_ESTA_LISTA: 'Solo se entrega una orden que está lista para entrega',
} as const;

export const mensajeSaldoPendiente = (saldo: number) =>
  `Saldo pendiente ${formatearPesos(saldo)}: no se puede entregar`;

// Lo que muestra la lista (y el dashboard en la Entrega B).
const SELECT_LISTA = {
  id: true,
  numero: true,
  estado: true,
  modalidad: true,
  valorCotizado: true,
  creadoEn: true,
  cliente: { select: { id: true, nombre: true, telefono: true } },
  equipo: {
    select: {
      id: true,
      marca: true,
      referencia: true,
      tipoEquipo: { select: { nombre: true } },
    },
  },
  responsable: { select: { id: true, nombre: true } },
} as const;

const SELECT_DETALLE = {
  ...SELECT_LISTA,
  direccionVisita: true,
  fechaVisita: true,
  fallaReportada: true,
  accesorios: true,
  estadoEquipo: true,
  porcentajeAbono: true,
  diasGarantia: true,
  diagnostico: true,
  aprobadaEn: true,
  actualizadoEn: true,
  fechaEntrega: true,
  recibidoPorNombre: true,
  fechaVencGarantia: true,
  entregadoPor: { select: { id: true, nombre: true } },
  // SWR-PAY-004: abonos y saldo, del más antiguo al más nuevo.
  pagos: {
    orderBy: { fecha: 'asc' },
    select: {
      id: true,
      tipo: true,
      medio: true,
      valor: true,
      referencia: true,
      fecha: true,
      usuario: { select: { nombre: true } },
    },
  },
  cliente: {
    select: { id: true, nombre: true, telefono: true, activo: true },
  },
  equipo: {
    select: {
      id: true,
      marca: true,
      referencia: true,
      serial: true,
      tipoEquipo: { select: { nombre: true } },
    },
  },
  creadoPor: { select: { id: true, nombre: true } },
  historialEstados: {
    orderBy: { fecha: 'asc' },
    select: {
      id: true,
      estadoAnterior: true,
      estadoNuevo: true,
      comentario: true,
      fecha: true,
      usuario: { select: { nombre: true } },
    },
  },
} as const satisfies Prisma.OrdenServicioSelect;

// F04: órdenes de servicio. Dueño y Técnico (AJ-03), lo exige el controlador.
@Injectable()
export class OrdenesService {
  // Logs sin datos personales: solo ids, número de orden, estados y montos.
  // Nunca la falla, el diagnóstico, nombres, teléfonos ni direcciones.
  private readonly logger = new JsonLogger(OrdenesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Lista paginada, las más nuevas primero. Busca por número de orden,
  // nombre o teléfono del cliente; filtra por estado.
  // Defecto 7: el nombre del cliente se busca sin tildes ni mayúsculas.
  async buscar({ buscar, estado, pagina = 1 }: BuscarOrdenesDto) {
    const digitos = buscar?.replace(/\D/g, '') ?? '';
    const nombre = buscar ? textoBusqueda(buscar) : '';
    const where: Prisma.OrdenServicioWhereInput = {
      ...(estado ? { estado } : {}),
      ...(buscar
        ? {
            OR: [
              { numero: { contains: buscar, mode: 'insensitive' } },
              ...(nombre
                ? [{ cliente: { nombreBusqueda: { contains: nombre } } }]
                : []),
              ...(digitos
                ? [{ cliente: { telefono: { contains: digitos } } }]
                : []),
            ],
          }
        : {}),
    };

    const [datos, total] = await Promise.all([
      this.prisma.ordenServicio.findMany({
        where,
        orderBy: { creadoEn: 'desc' },
        skip: (pagina - 1) * ORDENES_POR_PAGINA,
        take: ORDENES_POR_PAGINA,
        select: SELECT_LISTA,
      }),
      this.prisma.ordenServicio.count({ where }),
    ]);

    return { datos, total, pagina, porPagina: ORDENES_POR_PAGINA };
  }

  // Usuarios activos que pueden ser responsables (selector del formulario).
  listarResponsables() {
    return this.prisma.usuario.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true, rol: true },
    });
  }

  // SWR-ORD-001 + SWR-ORD-002 / AJ-06.
  async crear(dto: CrearOrdenDto, userId: number) {
    await this.validarClienteYEquipo(dto.clienteId, dto.equipoId);
    const responsableId = dto.responsableId ?? userId;
    await this.validarResponsable(responsableId);

    const modalidad = dto.modalidad ?? Modalidad.TALLER;
    const enDomicilio = modalidad === Modalidad.DOMICILIO;

    const orden = await this.prisma.$transaction(async (tx) => {
      // SWR-DATA-003: el % de abono y los días de garantía se COPIAN a la
      // orden. upsert: si nadie corrió el seed, se crea con los valores
      // por defecto (50 % y 90 días) en vez de fallar.
      const config = await tx.configuracion.upsert({
        where: { id: 1 },
        create: { id: 1 },
        update: {},
        select: { porcentajeAbono: true, diasGarantia: true },
      });

      // AJ-06: un consecutivo por año. Prisma lo hace con INSERT ... ON
      // CONFLICT DO UPDATE (atómico): dos órdenes simultáneas no reciben
      // el mismo número.
      const anio = anioColombia(new Date());
      const { ultimo } = await tx.consecutivoOrden.upsert({
        where: { anio },
        create: { anio, ultimo: 1 },
        update: { ultimo: { increment: 1 } },
        select: { ultimo: true },
      });

      const creada = await tx.ordenServicio.create({
        data: {
          numero: formatearNumeroOrden(anio, ultimo),
          clienteId: dto.clienteId,
          equipoId: dto.equipoId,
          responsableId,
          creadoPorId: userId,
          modalidad,
          direccionVisita: enDomicilio ? (dto.direccionVisita ?? null) : null,
          fechaVisita:
            enDomicilio && dto.fechaVisita ? new Date(dto.fechaVisita) : null,
          fallaReportada: dto.fallaReportada,
          accesorios: dto.accesorios ?? null,
          estadoEquipo: dto.estadoEquipo ?? null,
          porcentajeAbono: config.porcentajeAbono,
          diasGarantia: config.diasGarantia,
        },
        select: { id: true, numero: true, estado: true },
      });

      // SWR-ORD-011: el historial empieza con la recepción.
      await tx.historialEstado.create({
        data: {
          ordenId: creada.id,
          estadoAnterior: null,
          estadoNuevo: EstadoOrden.RECIBIDO,
          usuarioId: userId,
        },
      });
      return creada;
    });

    this.logger.event('INFO', 'ORDER_CREATED', 'Orden de servicio creada', {
      ordenId: orden.id,
      numero: orden.numero,
      clienteId: dto.clienteId,
      equipoId: dto.equipoId,
      responsableId,
      userId,
    });
    return orden;
  }

  // Detalle con historial y lo que la pantalla necesita para decidir qué
  // botones mostrar. Los bloqueos salen de las MISMAS reglas puras que
  // usa el backend al validar, así el navegador no repite la regla.
  async obtener(id: number) {
    const orden = await this.prisma.ordenServicio.findUnique({
      where: { id },
      select: SELECT_DETALLE,
    });
    if (!orden) throw new NotFoundException('Orden no encontrada');

    const { totalPagado, cantidadPagos } = await this.resumenPagos(
      this.prisma,
      id,
    );

    const siguienteEstado = siguientePorCambioDeEstado(orden.estado);
    const transicion = siguienteEstado
      ? evaluarTransicion(orden.estado, siguienteEstado, {
          valorCotizado: orden.valorCotizado,
          totalPagado,
          porcentajeAbono: orden.porcentajeAbono,
        })
      : null;
    const cotizacion = evaluarCotizacion(orden.estado, cantidadPagos);
    const saldo = calcularSaldo(orden.valorCotizado, [totalPagado]);

    return {
      ...orden,
      totalPagado,
      cantidadPagos,
      saldo,
      puedeEntregar: puedeEntregar(orden.estado, saldo),
      abonoMinimo:
        orden.valorCotizado === null
          ? null
          : abonoMinimo(orden.valorCotizado, orden.porcentajeAbono),
      siguienteEstado,
      bloqueoSiguiente:
        transicion && !transicion.permitido
          ? { motivo: transicion.motivo, mensaje: transicion.mensaje }
          : null,
      puedeCotizar: cotizacion.permitido,
      bloqueoCotizacion: cotizacion.permitido
        ? null
        : { motivo: cotizacion.motivo, mensaje: cotizacion.mensaje },
    };
  }

  // Editar los datos de la recepción (no el cliente, el equipo ni el estado).
  async actualizar(id: number, dto: ActualizarOrdenDto, userId: number) {
    const actual = await this.prisma.ordenServicio.findUnique({
      where: { id },
      select: {
        id: true,
        estado: true,
        modalidad: true,
        direccionVisita: true,
      },
    });
    if (!actual) throw new NotFoundException('Orden no encontrada');
    if (actual.estado === EstadoOrden.ENTREGADO) {
      throw new ConflictException(MENSAJE_ORDEN_ENTREGADA_NO_EDITA);
    }
    if (dto.responsableId !== undefined) {
      await this.validarResponsable(dto.responsableId);
    }

    // DOMICILIO exige dirección con el resultado final; TALLER la borra.
    const modalidad = dto.modalidad ?? actual.modalidad;
    const direccion =
      dto.direccionVisita !== undefined
        ? dto.direccionVisita
        : actual.direccionVisita;
    if (modalidad === Modalidad.DOMICILIO && !direccion) {
      throw new ErrorValidacion(
        ['direccionVisita'],
        [MENSAJE_DIRECCION_DOMICILIO],
      );
    }
    const { fechaVisita, ...resto } = dto;
    const data: Prisma.OrdenServicioUncheckedUpdateInput = {
      ...resto,
      ...(fechaVisita !== undefined
        ? { fechaVisita: fechaVisita ? new Date(fechaVisita) : null }
        : {}),
      ...(modalidad === Modalidad.TALLER
        ? { direccionVisita: null, fechaVisita: null }
        : {}),
    };

    const orden = await this.prisma.ordenServicio.update({
      where: { id },
      data,
      select: { id: true, numero: true, estado: true },
    });
    this.logger.event('INFO', 'ORDER_UPDATED', 'Orden actualizada', {
      ordenId: id,
      userId,
    });
    return orden;
  }

  // SWR-PAY-004 / AJ-09: registrar o corregir la cotización aprobada. Solo en
  // EN_DIAGNOSTICO y sin pagos; después el valor queda fijo.
  async registrarCotizacion(
    id: number,
    dto: RegistrarCotizacionDto,
    userId: number,
  ) {
    try {
      const resultado = await this.prisma.$transaction(async (tx) => {
        const orden = await this.bloquearOrden(tx, id);
        // Se cuentan los pagos CON la fila bloqueada: un pago simultáneo
        // (Entrega B) espera a que esto termine, o esto espera al pago.
        const { cantidadPagos } = await this.resumenPagos(tx, id);
        const evaluacion = evaluarCotizacion(orden.estado, cantidadPagos);
        if (!evaluacion.permitido) {
          throw new RechazoNegocio(evaluacion.motivo, evaluacion.mensaje, {
            estado: orden.estado,
            cantidadPagos,
          });
        }
        const actualizada = await tx.ordenServicio.update({
          where: { id },
          data: {
            diagnostico: dto.diagnostico,
            valorCotizado: dto.valorCotizado,
            aprobadaEn: new Date(), // cada corrección es una nueva aprobación
          },
          select: { id: true, valorCotizado: true, aprobadaEn: true },
        });
        return { actualizada, valorAnterior: orden.valorCotizado };
      });

      this.logger.event(
        'INFO',
        'ORDER_QUOTE_SET',
        'Cotización aprobada registrada',
        {
          ordenId: id,
          valorCotizado: dto.valorCotizado,
          valorAnterior: resultado.valorAnterior,
          correccion: resultado.valorAnterior !== null,
          userId,
        },
      );
      return resultado.actualizada;
    } catch (error) {
      if (error instanceof RechazoNegocio) {
        this.logger.event(
          'WARN',
          'ORDER_QUOTE_REJECTED',
          'Cotización rechazada',
          { ordenId: id, motivo: error.motivo, ...error.datos, userId },
        );
        throw error.comoConflicto();
      }
      throw error;
    }
  }

  // SWR-ORD-011 + AJ-07 + AJ-10: cambio de estado solo en secuencia, con
  // historial. La entrega (ENTREGADO) va por entregar().
  async cambiarEstado(id: number, dto: CambiarEstadoDto, userId: number) {
    try {
      const anterior = await this.prisma.$transaction(async (tx) => {
        // Con la fila bloqueada, dos clics seguidos se atienden uno tras
        // otro: el segundo ya ve el estado nuevo y recibe MISMO_ESTADO.
        const orden = await this.bloquearOrden(tx, id);
        const { totalPagado } = await this.resumenPagos(tx, id);
        const evaluacion = evaluarTransicion(orden.estado, dto.estadoNuevo, {
          valorCotizado: orden.valorCotizado,
          totalPagado,
          porcentajeAbono: orden.porcentajeAbono,
        });
        if (!evaluacion.permitido) {
          throw new RechazoNegocio(evaluacion.motivo, evaluacion.mensaje, {
            de: orden.estado,
            a: dto.estadoNuevo,
            ...(evaluacion.motivo === 'FALTA_ABONO'
              ? {
                  abonoMinimo: evaluacion.abonoMinimo,
                  totalPagado: evaluacion.totalPagado,
                }
              : {}),
          });
        }

        await tx.ordenServicio.update({
          where: { id },
          data: { estado: dto.estadoNuevo },
        });
        await tx.historialEstado.create({
          data: {
            ordenId: id,
            estadoAnterior: orden.estado,
            estadoNuevo: dto.estadoNuevo,
            usuarioId: userId,
            comentario: dto.comentario ?? null,
          },
        });
        return orden.estado;
      });

      this.logger.event(
        'INFO',
        'ORDER_STATUS_CHANGED',
        'Estado de la orden cambiado',
        { ordenId: id, de: anterior, a: dto.estadoNuevo, userId },
      );
      return { id, estado: dto.estadoNuevo };
    } catch (error) {
      if (error instanceof RechazoNegocio) {
        this.logger.event(
          'WARN',
          'ORDER_TRANSITION_REJECTED',
          'Cambio de estado rechazado',
          { ordenId: id, motivo: error.motivo, ...error.datos, userId },
        );
        throw error.comoConflicto();
      }
      throw error;
    }
  }

  // SWR-PAY-004: registrar un abono o el pago del saldo. El tipo lo decide
  // el servidor (SALDO si cubre todo lo que falta; si no, ABONO).
  async registrarPago(id: number, dto: RegistrarPagoDto, userId: number) {
    try {
      const { pago, saldoResultante } = await this.prisma.$transaction(
        async (tx) => {
          // PRIMERO se bloquea la fila; DESPUÉS se suman los pagos. Así dos
          // pagos simultáneos se atienden uno tras otro y el segundo ve el
          // saldo que dejó el primero (nunca se paga de más).
          const orden = await this.bloquearOrden(tx, id);
          const { totalPagado } = await this.resumenPagos(tx, id);
          const validacion = validarPago(dto.valor, {
            estado: orden.estado,
            valorCotizado: orden.valorCotizado,
            pagos: [totalPagado],
          });
          if (!validacion.valido) {
            throw new RechazoNegocio(validacion.motivo, validacion.mensaje, {});
          }

          const creado = await tx.pago.create({
            data: {
              ordenId: id,
              tipo: tipoPago(validacion.valor, validacion.saldo),
              medio: dto.medio,
              valor: validacion.valor,
              referencia: dto.referencia ?? null,
              usuarioId: userId,
            },
            select: {
              id: true,
              tipo: true,
              medio: true,
              valor: true,
              referencia: true,
              fecha: true,
            },
          });
          return { pago: creado, saldoResultante: validacion.saldoResultante };
        },
      );

      // Sin la referencia: puede identificar una cuenta bancaria.
      this.logger.event('INFO', 'PAYMENT_REGISTERED', 'Pago registrado', {
        ordenId: id,
        pagoId: pago.id,
        tipo: pago.tipo,
        medio: pago.medio,
        valor: pago.valor,
        saldoResultante,
        userId,
      });
      return { pago, saldo: saldoResultante };
    } catch (error) {
      if (error instanceof RechazoNegocio) {
        this.logger.event('WARN', 'PAYMENT_REJECTED', 'Pago rechazado', {
          ordenId: id,
          motivo: error.motivo,
          userId,
        });
        throw error.comoConflicto();
      }
      throw error;
    }
  }

  // SWR-ENT-003: entregar el equipo. Solo en LISTO_PARA_ENTREGA y con saldo
  // 0. Guarda quién entregó, quién recibió y hasta cuándo va la garantía.
  async entregar(id: number, dto: EntregarOrdenDto, userId: number) {
    try {
      const resultado = await this.prisma.$transaction(async (tx) => {
        const orden = await this.bloquearOrden(tx, id);
        const { totalPagado } = await this.resumenPagos(tx, id);
        const saldo = calcularSaldo(orden.valorCotizado, [totalPagado]);

        if (!puedeEntregar(orden.estado, saldo)) {
          if (orden.estado === EstadoOrden.ENTREGADO) {
            throw new RechazoNegocio(
              'YA_ENTREGADO',
              MENSAJES_ENTREGA.YA_ENTREGADO,
              { estado: orden.estado },
            );
          }
          if (orden.estado !== EstadoOrden.LISTO_PARA_ENTREGA) {
            throw new RechazoNegocio(
              'NO_ESTA_LISTA',
              MENSAJES_ENTREGA.NO_ESTA_LISTA,
              { estado: orden.estado },
            );
          }
          // LISTO_PARA_ENTREGA con saldo > 0. (Sin cotización no se llega
          // a LISTO: evaluarTransicion exige el abono para reparar.)
          const pendiente = saldo ?? 0;
          throw new RechazoNegocio(
            'SALDO_PENDIENTE',
            mensajeSaldoPendiente(pendiente),
            { saldo: pendiente },
          );
        }

        const fechaEntrega = new Date();
        const fechaVencGarantia = vencimientoGarantia(
          fechaEntrega,
          orden.diasGarantia,
        );
        await tx.ordenServicio.update({
          where: { id },
          data: {
            estado: EstadoOrden.ENTREGADO,
            fechaEntrega,
            entregadoPorId: userId,
            recibidoPorNombre: dto.recibidoPorNombre,
            fechaVencGarantia,
          },
        });
        await tx.historialEstado.create({
          data: {
            ordenId: id,
            estadoAnterior: orden.estado,
            estadoNuevo: EstadoOrden.ENTREGADO,
            usuarioId: userId,
          },
        });
        return { fechaEntrega, fechaVencGarantia };
      });

      // Sin recibidoPorNombre: es un dato personal.
      this.logger.event('INFO', 'ORDER_DELIVERED', 'Equipo entregado', {
        ordenId: id,
        userId,
      });
      return { id, estado: EstadoOrden.ENTREGADO, ...resultado };
    } catch (error) {
      if (error instanceof RechazoNegocio) {
        if (error.motivo === 'SALDO_PENDIENTE') {
          this.logger.event(
            'WARN',
            'DELIVERY_BLOCKED_BALANCE',
            'Entrega bloqueada por saldo pendiente',
            { ordenId: id, saldo: error.datos.saldo, userId },
          );
        } else {
          this.logger.event('WARN', 'DELIVERY_REJECTED', 'Entrega rechazada', {
            ordenId: id,
            motivo: error.motivo,
            ...error.datos,
            userId,
          });
        }
        throw error.comoConflicto();
      }
      throw error;
    }
  }

  // ---------- auxiliares ----------

  // Bloquea la fila de la orden hasta que termine la transacción (un UPDATE
  // en PostgreSQL toma el candado de la fila). Así un pago, una corrección
  // de la cotización o un cambio de estado simultáneos sobre la MISMA orden
  // se atienden uno a la vez y cada uno ve lo que dejó el anterior.
  private async bloquearOrden(tx: Prisma.TransactionClient, id: number) {
    try {
      return await tx.ordenServicio.update({
        where: { id },
        data: { actualizadoEn: new Date() },
        select: {
          id: true,
          estado: true,
          valorCotizado: true,
          porcentajeAbono: true,
          diasGarantia: true,
        },
      });
    } catch (error) {
      if (esNoEncontrado(error)) {
        throw new NotFoundException('Orden no encontrada');
      }
      throw error;
    }
  }

  // SWR-ORD-001: el equipo debe ser DEL cliente y ambos estar activos.
  private async validarClienteYEquipo(clienteId: number, equipoId: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { id: true, activo: true },
    });
    if (!cliente) throw new BadRequestException('El cliente no existe');
    if (!cliente.activo) {
      throw new ConflictException(
        'No se pueden crear órdenes para un cliente desactivado',
      );
    }

    const equipo = await this.prisma.equipo.findUnique({
      where: { id: equipoId },
      select: { id: true, clienteId: true, activo: true },
    });
    if (!equipo || equipo.clienteId !== clienteId) {
      throw new BadRequestException('El equipo no pertenece a este cliente');
    }
    if (!equipo.activo) {
      throw new ConflictException(
        'No se pueden crear órdenes para un equipo desactivado',
      );
    }
  }

  private async validarResponsable(responsableId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: responsableId },
      select: { id: true, activo: true },
    });
    if (!usuario || !usuario.activo) {
      throw new BadRequestException('El responsable no existe o está inactivo');
    }
  }

  // Suma y cantidad de pagos de la orden.
  private async resumenPagos(
    cliente: PrismaService | Prisma.TransactionClient,
    ordenId: number,
  ) {
    const resumen = await cliente.pago.aggregate({
      where: { ordenId },
      _sum: { valor: true },
      _count: { _all: true },
    });
    return {
      totalPagado: resumen._sum.valor ?? 0,
      cantidadPagos: resumen._count._all,
    };
  }
}
