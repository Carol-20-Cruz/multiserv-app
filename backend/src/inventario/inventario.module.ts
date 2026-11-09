import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InventarioController } from './inventario.controller';
import { InventarioService } from './inventario.service';

// F07: inventario de repuestos (solo Dueño, AJ-03).
@Module({
  imports: [AuthModule], // JwtAuthGuard, RolesGuard
  controllers: [InventarioController],
  providers: [InventarioService],
})
export class InventarioModule {}
