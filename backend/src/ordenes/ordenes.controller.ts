import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PERMISOS } from '../auth/reglas/permisos';
import type { RequestConUsuario } from '../auth/usuario-autenticado';
import { ActualizarOrdenDto } from './dto/actualizar-orden.dto';
import { BuscarOrdenesDto } from './dto/buscar-ordenes.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { CrearOrdenDto } from './dto/crear-orden.dto';
import { EntregarOrdenDto } from './dto/entregar-orden.dto';
import { RegistrarCotizacionDto } from './dto/registrar-cotizacion.dto';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { OrdenesService } from './ordenes.service';

// Portero: token válido (JwtAuthGuard) y rol permitido (RolesGuard).
// AJ-03 + validación con la dueña: Dueño y Técnico registran órdenes.
@Controller('ordenes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...PERMISOS.ordenes)
export class OrdenesController {
  constructor(private readonly ordenesService: OrdenesService) {}

  @Get()
  buscar(@Query() query: BuscarOrdenesDto) {
    return this.ordenesService.buscar(query);
  }

  // Selector de responsable. (Va antes de ':id'.)
  @Get('responsables')
  responsables() {
    return this.ordenesService.listarResponsables();
  }

  // SWR-ORD-001 + SWR-ORD-002.
  @Post()
  crear(@Body() dto: CrearOrdenDto, @Req() req: RequestConUsuario) {
    return this.ordenesService.crear(dto, req.user!.id);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.ordenesService.obtener(id);
  }

  // Datos de la recepción. Las órdenes no se borran (trazabilidad, BR-06).
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarOrdenDto,
    @Req() req: RequestConUsuario,
  ) {
    return this.ordenesService.actualizar(id, dto, req.user!.id);
  }

  // SWR-PAY-004 / AJ-09: registrar o corregir la cotización aprobada
  // (en diagnóstico y sin pagos).
  @Put(':id/cotizacion')
  registrarCotizacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegistrarCotizacionDto,
    @Req() req: RequestConUsuario,
  ) {
    return this.ordenesService.registrarCotizacion(id, dto, req.user!.id);
  }

  // SWR-ORD-011 / AJ-07 / AJ-10: cambiar al siguiente estado.
  @Post(':id/estado')
  @HttpCode(200)
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoDto,
    @Req() req: RequestConUsuario,
  ) {
    return this.ordenesService.cambiarEstado(id, dto, req.user!.id);
  }

  // SWR-PAY-004: registrar un abono o el saldo (PERMISOS.pagos).
  @Post(':id/pagos')
  @Roles(...PERMISOS.pagos)
  registrarPago(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegistrarPagoDto,
    @Req() req: RequestConUsuario,
  ) {
    return this.ordenesService.registrarPago(id, dto, req.user!.id);
  }

  // SWR-ENT-003: entregar el equipo (LISTO_PARA_ENTREGA y saldo 0).
  @Post(':id/entregar')
  @HttpCode(200)
  @Roles(...PERMISOS.pagos)
  entregar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EntregarOrdenDto,
    @Req() req: RequestConUsuario,
  ) {
    return this.ordenesService.entregar(id, dto, req.user!.id);
  }
}
