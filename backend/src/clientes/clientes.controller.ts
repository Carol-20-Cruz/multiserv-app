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
import { ErrorValidacion } from '../logging/error-validacion';
import { ClientesService } from './clientes.service';
import { ActualizarClienteDto } from './dto/actualizar-cliente.dto';
import { BuscarClientesDto } from './dto/buscar-clientes.dto';
import { CrearClienteDto } from './dto/crear-cliente.dto';
import { CrearEquipoDto } from './dto/crear-equipo.dto';
import { validarTelefono } from './reglas/telefono';

// Portero: token válido (JwtAuthGuard) y rol permitido (RolesGuard).
// AJ-03: Dueño y Técnico pueden usar todo el módulo de clientes y equipos.
@Controller('clientes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...PERMISOS.clientes)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  // Listar y buscar por nombre o teléfono.
  @Get()
  buscar(@Query() query: BuscarClientesDto) {
    return this.clientesService.buscar(query);
  }

  // SWR-CLI-004 / AJ-04: el formulario pregunta ANTES de enviar.
  // (Va antes de ':id' para que "verificar-telefono" no se tome como id.)
  // excluir: id del cliente que se está editando (su propio teléfono no
  // es un duplicado).
  @Get('verificar-telefono')
  async verificarTelefono(
    @Query('telefono') telefono: unknown,
    @Query('excluir', new ParseIntPipe({ optional: true }))
    excluir: number | undefined,
    @Req() req: RequestConUsuario,
  ) {
    const resultado = validarTelefono(telefono);
    if (!resultado.valido) {
      throw new ErrorValidacion(['telefono'], [resultado.mensaje]);
    }
    const cliente = await this.clientesService.verificarTelefono(
      resultado.telefono,
      req.user!.id,
      excluir,
    );
    return cliente ? { existe: true, cliente } : { existe: false };
  }

  // SWR-CLI-001, SWR-CLI-003, SWR-CLI-004 / AJ-04.
  @Post()
  crear(@Body() dto: CrearClienteDto, @Req() req: RequestConUsuario) {
    return this.clientesService.crear(dto, req.user!.id);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.obtener(id);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarClienteDto,
    @Req() req: RequestConUsuario,
  ) {
    return this.clientesService.actualizar(id, dto, req.user!.id);
  }

  // SWR-DATA-005: desactivar sin borrar.
  @Patch(':id/desactivar')
  desactivar(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestConUsuario,
  ) {
    return this.clientesService.desactivar(id, req.user!.id);
  }

  // SWR-EQP-003: asociar un equipo al cliente.
  @Post(':id/equipos')
  @Roles(...PERMISOS.equipos)
  agregarEquipo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CrearEquipoDto,
    @Req() req: RequestConUsuario,
  ) {
    return this.clientesService.agregarEquipo(id, dto, req.user!.id);
  }
}
