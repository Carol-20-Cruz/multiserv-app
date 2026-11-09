import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PERMISOS } from '../auth/reglas/permisos';
import { ClientesService } from './clientes.service';

// GET /tipos-equipo — opciones del selector "Tipo de equipo".
@Controller('tipos-equipo')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...PERMISOS.equipos)
export class TiposEquipoController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get()
  listar() {
    return this.clientesService.listarTiposEquipo();
  }
}
