import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { textoBusqueda } from '../comun/texto-busqueda';
import type { Prisma } from '../generated/prisma/client';
import { JsonLogger } from '../logging/json-logger';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarRepuestoDto } from './dto/actualizar-repuesto.dto';
import { BuscarRepuestosDto } from './dto/buscar-repuestos.dto';
import { CrearRepuestoDto } from './dto/crear-repuesto.dto';
import { RegistrarEntradaDto } from './dto/registrar-entrada.dto';
import {
  esStockBajo,
  evaluarCambioStock,
  type EstadoStock,
} from './reglas/stock';

// Dónde se detectó que el repuesto entró en existencia baja.
type OrigenStockBajo = 'CREACION' | 'EDICION';

export const REPUESTOS_POR_PAGINA = 10;
export const MOTIVO_STOCK_INICIAL = 'Stock inicial';
export const MENSAJE_REFERENCIA_DUPLICADA =
  'Ya existe un repuesto con esta referencia';
export const MENSAJE_REFERENCIA_DESACTIVADA =
  'Existe un repuesto desactivado con esta referencia';

const SELECT_REPUESTO = {
  id: true,
  nombre: true,
  referencia: true,
  marcaCompatible: true,
  cantidad: true,
  cantidadMinima: true,
  precioVenta: true,
  activo: true,
  tipoEquipo: { select: { id: true, nombre: true } },
} as const;

type RepuestoSeleccionado = Prisma.RepuestoGetPayload<{
  select: typeof SELECT_REPUESTO;
}>;

// SWR-INV-009: cada repuesto sale con su indicador de existencia baja.
const conIndicador = <T extends RepuestoSeleccionado>(repuesto: T) => ({
  ...repuesto,
  stockBajo: esStockBajo(repuesto.cantidad, repuesto.cantidadMinima),
});

// Error de Prisma por @unique violado (dos registros simultáneos).
const esUnicoViolado = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === 'P2002';

// F07: inventario de repuestos. Solo Dueño (AJ-03), lo exige el controlador.
@Injectable()
export class InventarioService {
  // Logs sin datos personales: solo ids y cantidades.
  private readonly logger = new JsonLogger(InventarioService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Listar activos: buscar por nombre o referencia, filtrar por tipo de
  // equipo y, si se pide, solo los que están en existencia baja.
  async buscar({
    buscar,
    tipoEquipoId,
    soloStockBajo,
    pagina = 1,
  }: BuscarRepuestosDto) {
    // Defecto 7: el nombre se busca sin tildes ni mayúsculas en
    // "nombreBusqueda" (la llena un trigger); la referencia es un código.
    const nombre = buscar ? textoBusqueda(buscar) : '';
    const where: Prisma.RepuestoWhereInput = {
      activo: true,
      ...(tipoEquipoId ? { tipoEquipoId } : {}),
      ...(soloStockBajo ? this.condicionStockBajo() : {}),
      ...(buscar
        ? {
            OR: [
              ...(nombre ? [{ nombreBusqueda: { contains: nombre } }] : []),
              { referencia: { contains: buscar, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [datos, total] = await Promise.all([
      this.prisma.repuesto.findMany({
        where,
        orderBy: { nombre: 'asc' },
        skip: (pagina - 1) * REPUESTOS_POR_PAGINA,
        take: REPUESTOS_POR_PAGINA,
        select: SELECT_REPUESTO,
      }),
      this.prisma.repuesto.count({ where }),
    ]);

    return {
      datos: datos.map(conIndicador),
      total,
      pagina,
      porPagina: REPUESTOS_POR_PAGINA,
    };
  }

  // SWR-INV-009: cuántos repuestos activos están en existencia baja
  // (aviso de /inventario y tarjeta del Inicio).
  async resumenStock() {
    const total = await this.prisma.repuesto.count({
      where: { activo: true, ...this.condicionStockBajo() },
    });
    return { total };
  }

  // SWR-INV-001 + AJ-05. El stock inicial queda como movimiento ENTRADA.
  async crear(dto: CrearRepuestoDto, userId: number) {
    await this.validarTipoEquipo(dto.tipoEquipoId);
    await this.impedirReferenciaDuplicada(dto.referencia, userId);

    const { cantidadInicial, ...datos } = dto;
    try {
      const { repuesto, movimientoId } = await this.prisma.$transaction(
        async (tx) => {
          const creado = await tx.repuesto.create({
            data: { ...datos, cantidad: cantidadInicial },
            select: SELECT_REPUESTO,
          });
          // Con stock 0 no hay nada que registrar.
          if (cantidadInicial === 0) {
            return { repuesto: creado, movimientoId: null };
          }
          const movimiento = await tx.movimientoInventario.create({
            data: {
              repuestoId: creado.id,
              tipo: 'ENTRADA',
              cantidad: cantidadInicial,
              saldoResultante: cantidadInicial,
              motivo: MOTIVO_STOCK_INICIAL,
              usuarioId: userId,
            },
            select: { id: true },
          });
          return { repuesto: creado, movimientoId: movimiento.id };
        },
      );

      this.logger.event('INFO', 'PART_CREATED', 'Repuesto registrado', {
        repuestoId: repuesto.id,
        tipoEquipoId: repuesto.tipoEquipo.id,
        userId,
      });
      if (movimientoId !== null) {
        this.logger.event('INFO', 'STOCK_ENTRY', 'Entrada de inventario', {
          repuestoId: repuesto.id,
          movimientoId,
          cantidad: cantidadInicial,
          saldoResultante: repuesto.cantidad,
          userId,
        });
      }
      this.alertarSiEntraEnBajo(null, repuesto, 'CREACION', userId);
      return conIndicador(repuesto);
    } catch (error) {
      // El candado @unique de la base atrapó un registro simultáneo.
      if (esUnicoViolado(error)) {
        await this.impedirReferenciaDuplicada(dto.referencia, userId);
      }
      throw error;
    }
  }

  // Detalle con los últimos movimientos (historial del stock).
  async obtener(id: number) {
    const repuesto = await this.prisma.repuesto.findUnique({
      where: { id },
      select: {
        ...SELECT_REPUESTO,
        creadoEn: true,
        movimientos: {
          orderBy: { fecha: 'desc' },
          take: 20,
          select: {
            id: true,
            tipo: true,
            cantidad: true,
            saldoResultante: true,
            proveedor: true,
            motivo: true,
            fecha: true,
            usuario: { select: { nombre: true } },
          },
        },
      },
    });
    if (!repuesto) throw new NotFoundException('Repuesto no encontrado');
    return conIndicador(repuesto);
  }

  // Editar datos y mínimo. La cantidad NO se edita aquí.
  async actualizar(id: number, dto: ActualizarRepuestoDto, userId: number) {
    const actual = await this.activoOFalla(
      id,
      'No se puede editar un repuesto desactivado',
    );

    if (dto.tipoEquipoId !== undefined) {
      await this.validarTipoEquipo(dto.tipoEquipoId);
    }
    if (dto.referencia && dto.referencia !== actual.referencia) {
      await this.impedirReferenciaDuplicada(dto.referencia, userId);
    }

    try {
      const repuesto = await this.prisma.repuesto.update({
        where: { id },
        data: dto,
        select: SELECT_REPUESTO,
      });
      this.logger.event('INFO', 'PART_UPDATED', 'Repuesto actualizado', {
        repuestoId: id,
        userId,
      });
      // SWR-INV-009: subir el mínimo puede dejar el repuesto en stock bajo.
      this.alertarSiEntraEnBajo(actual, repuesto, 'EDICION', userId);
      return conIndicador(repuesto);
    } catch (error) {
      if (esUnicoViolado(error) && dto.referencia) {
        await this.impedirReferenciaDuplicada(dto.referencia, userId);
      }
      throw error;
    }
  }

  // Registrar repuestos que llegan del proveedor: suma stock y deja el
  // movimiento ENTRADA con el saldo resultante, todo en una transacción.
  // Una entrada solo suma, así que nunca hace ENTRAR en stock bajo; si el
  // repuesto sigue bajo, la alerta se sigue viendo en la pantalla.
  async registrarEntrada(id: number, dto: RegistrarEntradaDto, userId: number) {
    await this.activoOFalla(
      id,
      'No se pueden registrar entradas en un repuesto desactivado',
    );

    const { repuesto, movimientoId } = await this.prisma.$transaction(
      async (tx) => {
        // increment es atómico: dos entradas simultáneas no se pisan.
        const actualizado = await tx.repuesto.update({
          where: { id },
          data: { cantidad: { increment: dto.cantidad } },
          select: SELECT_REPUESTO,
        });
        const movimiento = await tx.movimientoInventario.create({
          data: {
            repuestoId: id,
            tipo: 'ENTRADA',
            cantidad: dto.cantidad,
            saldoResultante: actualizado.cantidad,
            proveedor: dto.proveedor ?? null,
            motivo: dto.motivo ?? null,
            usuarioId: userId,
          },
          select: { id: true },
        });
        return { repuesto: actualizado, movimientoId: movimiento.id };
      },
    );

    this.logger.event('INFO', 'STOCK_ENTRY', 'Entrada de inventario', {
      repuestoId: id,
      movimientoId,
      cantidad: dto.cantidad,
      saldoResultante: repuesto.cantidad,
      userId,
    });
    return conIndicador(repuesto);
  }

  // Desactivar, nunca borrar.
  async desactivar(id: number, userId: number) {
    await this.existeOFalla(id);
    const repuesto = await this.prisma.repuesto.update({
      where: { id },
      data: { activo: false },
      select: SELECT_REPUESTO,
    });
    this.logger.event('INFO', 'PART_DEACTIVATED', 'Repuesto desactivado', {
      repuestoId: id,
      userId,
    });
    return conIndicador(repuesto);
  }

  // ---------- auxiliares ----------

  // SWR-INV-009: STOCK_LOW solo cuando el repuesto CRUZA el umbral (no en
  // cada cambio mientras sigue bajo). antes = null -> repuesto nuevo.
  private alertarSiEntraEnBajo(
    antes: RepuestoSeleccionado | null,
    despues: RepuestoSeleccionado,
    origen: OrigenStockBajo,
    userId: number,
  ) {
    const estado = (r: RepuestoSeleccionado): EstadoStock => ({
      cantidad: r.cantidad,
      minimo: r.cantidadMinima,
    });
    const cambio = evaluarCambioStock(
      antes ? estado(antes) : null,
      estado(despues),
    );
    if (cambio !== 'ENTRA_EN_BAJO') return;

    this.logger.event('WARN', 'STOCK_LOW', 'Repuesto en existencia baja', {
      repuestoId: despues.id,
      cantidad: despues.cantidad,
      cantidadMinima: despues.cantidadMinima,
      origen,
      userId,
    });
  }

  // cantidad <= cantidadMinima comparando dos columnas en la base
  // (la misma regla que esStockBajo).
  private condicionStockBajo(): Prisma.RepuestoWhereInput {
    return { cantidad: { lte: this.prisma.repuesto.fields.cantidadMinima } };
  }

  private async existeOFalla(id: number) {
    const repuesto = await this.prisma.repuesto.findUnique({
      where: { id },
      select: SELECT_REPUESTO,
    });
    if (!repuesto) throw new NotFoundException('Repuesto no encontrado');
    return repuesto;
  }

  private async activoOFalla(id: number, mensaje: string) {
    const repuesto = await this.existeOFalla(id);
    if (!repuesto.activo) throw new ConflictException(mensaje);
    return repuesto;
  }

  // AJ-05: el tipo de equipo debe existir y estar activo.
  private async validarTipoEquipo(tipoEquipoId: number) {
    const tipo = await this.prisma.tipoEquipo.findUnique({
      where: { id: tipoEquipoId },
    });
    if (!tipo || !tipo.activo) {
      throw new BadRequestException('El tipo de equipo no existe');
    }
  }

  // Referencia única: 409, con mensaje distinto si el existente está
  // desactivado (no se reactiva desde aquí).
  private async impedirReferenciaDuplicada(referencia: string, userId: number) {
    const existente = await this.prisma.repuesto.findUnique({
      where: { referencia },
      select: { id: true, activo: true },
    });
    if (!existente) return;

    this.logger.event(
      'WARN',
      'PART_DUPLICATE_REFERENCE',
      'Referencia de un repuesto existente',
      { repuestoExistenteId: existente.id, activo: existente.activo, userId },
    );
    throw new ConflictException(
      existente.activo
        ? MENSAJE_REFERENCIA_DUPLICADA
        : MENSAJE_REFERENCIA_DESACTIVADA,
    );
  }
}
