import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PERMISOS } from '../auth/reglas/permisos';
import type { RequestConUsuario } from '../auth/usuario-autenticado';
import { ActualizarRepuestoDto } from './dto/actualizar-repuesto.dto';
import { BuscarRepuestosDto } from './dto/buscar-repuestos.dto';
import { CrearRepuestoDto } from './dto/crear-repuesto.dto';
import { InventarioService } from './inventario.service';

// Portero: token válido (JwtAuthGuard) y rol permitido (RolesGuard).
// AJ-03: SOLO el Dueño usa inventario; el Técnico recibe 403 en todo.
@Controller('repuestos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...PERMISOS.repuestos)
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Get()
  buscar(@Query() query: BuscarRepuestosDto) {
    return this.inventarioService.buscar(query);
  }

  // SWR-INV-009: total en existencia baja.
  // (Va antes de ':id' para que "resumen-stock" no se tome como id.)
  @Get('resumen-stock')
  resumenStock() {
    return this.inventarioService.resumenStock();
  }

  // SWR-INV-001 + AJ-05.
  @Post()
  crear(@Body() dto: CrearRepuestoDto, @Req() req: RequestConUsuario) {
    return this.inventarioService.crear(dto, req.user!.id);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.inventarioService.obtener(id);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarRepuestoDto,
    @Req() req: RequestConUsuario,
  ) {
    return this.inventarioService.actualizar(id, dto, req.user!.id);
  }

  // Desactivar sin borrar.
  @Patch(':id/desactivar')
  desactivar(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestConUsuario,
  ) {
    return this.inventarioService.desactivar(id, req.user!.id);
  }
}
