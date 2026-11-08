import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JsonLogger } from '../logging/json-logger';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarClienteDto } from './dto/actualizar-cliente.dto';
import { BuscarClientesDto } from './dto/buscar-clientes.dto';
import { CrearClienteDto } from './dto/crear-cliente.dto';
import { CrearEquipoDto } from './dto/crear-equipo.dto';

export const CLIENTES_POR_PAGINA = 10;
export const MENSAJE_TELEFONO_DUPLICADO =
  'Ya existe un cliente con este teléfono';

// Datos básicos que se devuelven cuando el teléfono ya existe (AJ-04).
const SELECT_BASICO = {
  id: true,
  nombre: true,
  telefono: true,
  activo: true,
} as const;

export type ClienteBasico = {
  id: number;
  nombre: string;
  telefono: string;
  activo: boolean;
};

// Error de Prisma por @unique violado (dos registros simultáneos).
const esUnicoViolado = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === 'P2002';

@Injectable()
export class ClientesService {
  // Logs sin datos personales: solo ids.
  private readonly logger = new JsonLogger(ClientesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Listar y buscar por nombre o teléfono (solo clientes activos).
  async buscar({ buscar, pagina = 1 }: BuscarClientesDto) {
    const digitos = buscar?.replace(/\D/g, '') ?? '';
    const where = {
      activo: true,
      ...(buscar
        ? {
            OR: [
              { nombre: { contains: buscar, mode: 'insensitive' as const } },
              ...(digitos ? [{ telefono: { contains: digitos } }] : []),
            ],
          }
        : {}),
    };

    const [datos, total] = await Promise.all([
      this.prisma.cliente.findMany({
        where,
        orderBy: { nombre: 'asc' },
        skip: (pagina - 1) * CLIENTES_POR_PAGINA,
        take: CLIENTES_POR_PAGINA,
        select: {
          ...SELECT_BASICO,
          barrio: true,
          ciudad: true,
          _count: { select: { equipos: { where: { activo: true } } } },
        },
      }),
      this.prisma.cliente.count({ where }),
    ]);

    return {
      datos: datos.map(({ _count, ...cliente }) => ({
        ...cliente,
        equipos: _count.equipos,
      })),
      total,
      pagina,
      porPagina: CLIENTES_POR_PAGINA,
    };
  }

  // SWR-CLI-004 / AJ-04: ¿ya hay un cliente con este teléfono (normalizado)?
  buscarPorTelefono(telefono: string): Promise<ClienteBasico | null> {
    return this.prisma.cliente.findUnique({
      where: { telefono },
      select: SELECT_BASICO,
    });
  }

  // SWR-CLI-001 + SWR-CLI-004 / AJ-04 + Ley 1581.
  async crear(dto: CrearClienteDto, userId: number) {
    // AJ-04: verificar ANTES de registrar; si existe, se impide.
    await this.impedirDuplicado(dto.telefono, userId);

    try {
      const cliente = await this.prisma.cliente.create({
        data: {
          ...dto,
          ciudad: dto.ciudad ?? undefined, // null -> valor por defecto (Neiva)
          autorizaDatos: true,
          fechaAutorizacion: new Date(), // hora del servidor
        },
        select: SELECT_BASICO,
      });
      this.logger.event('INFO', 'CLIENT_CREATED', 'Cliente registrado', {
        clienteId: cliente.id,
        userId,
      });
      return cliente;
    } catch (error) {
      // El candado @unique de la base atrapó un registro simultáneo.
      if (esUnicoViolado(error)) {
        await this.impedirDuplicado(dto.telefono, userId);
      }
      throw error;
    }
  }

  // Detalle con sus equipos activos.
  async obtener(id: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: {
        equipos: {
          where: { activo: true },
          orderBy: { creadoEn: 'desc' },
          include: { tipoEquipo: { select: { id: true, nombre: true } } },
        },
      },
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return cliente;
  }

  // Editar datos de contacto. Si cambia el teléfono, se revisa el duplicado.
  async actualizar(id: number, dto: ActualizarClienteDto, userId: number) {
    const actual = await this.existeOFalla(id);

    if (dto.telefono && dto.telefono !== actual.telefono) {
      await this.impedirDuplicado(dto.telefono, userId);
    }

    try {
      const cliente = await this.prisma.cliente.update({
        where: { id },
        data: { ...dto, ciudad: dto.ciudad ?? undefined },
        select: SELECT_BASICO,
      });
      this.logger.event('INFO', 'CLIENT_UPDATED', 'Cliente actualizado', {
        clienteId: id,
        userId,
      });
      return cliente;
    } catch (error) {
      if (esUnicoViolado(error) && dto.telefono) {
        await this.impedirDuplicado(dto.telefono, userId);
      }
      throw error;
    }
  }

  // SWR-DATA-005: desactivar, nunca borrar.
  async desactivar(id: number, userId: number) {
    await this.existeOFalla(id);
    const cliente = await this.prisma.cliente.update({
      where: { id },
      data: { activo: false },
      select: SELECT_BASICO,
    });
    this.logger.event('INFO', 'CLIENT_DEACTIVATED', 'Cliente desactivado', {
      clienteId: id,
      userId,
    });
    return cliente;
  }

  // SWR-EQP-003: asociar un equipo al cliente.
  async agregarEquipo(clienteId: number, dto: CrearEquipoDto, userId: number) {
    const cliente = await this.existeOFalla(clienteId);
    if (!cliente.activo) {
      throw new ConflictException(
        'No se pueden agregar equipos a un cliente desactivado',
      );
    }

    const tipo = await this.prisma.tipoEquipo.findUnique({
      where: { id: dto.tipoEquipoId },
    });
    if (!tipo || !tipo.activo) {
      throw new BadRequestException('El tipo de equipo no existe');
    }

    const equipo = await this.prisma.equipo.create({
      data: { ...dto, clienteId },
      include: { tipoEquipo: { select: { id: true, nombre: true } } },
    });
    this.logger.event('INFO', 'EQUIPMENT_ADDED', 'Equipo asociado al cliente', {
      equipoId: equipo.id,
      clienteId,
      userId,
    });
    return equipo;
  }

  listarTiposEquipo() {
    return this.prisma.tipoEquipo.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true },
    });
  }

  // ---------- auxiliares ----------

  private async existeOFalla(id: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      select: SELECT_BASICO,
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return cliente;
  }

  // AJ-04: si el teléfono ya existe, 409 con los datos básicos del existente.
  private async impedirDuplicado(telefono: string, userId: number) {
    const existente = await this.buscarPorTelefono(telefono);
    if (!existente) return;

    this.logger.event(
      'WARN',
      'CLIENT_DUPLICATE_PHONE',
      'Registro impedido: teléfono ya existe',
      { clienteExistenteId: existente.id, userId },
    );
    throw new ConflictException({
      statusCode: 409,
      message: MENSAJE_TELEFONO_DUPLICADO,
      cliente: existente,
    });
  }
}
