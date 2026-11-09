import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';
import { TiposEquipoController } from './tipos-equipo.controller';

// F03: clientes y equipos.
@Module({
  imports: [AuthModule], // JwtAuthGuard, RolesGuard
  controllers: [ClientesController, TiposEquipoController],
  providers: [ClientesService],
})
export class ClientesModule {}
