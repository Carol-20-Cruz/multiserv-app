import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrdenesController } from './ordenes.controller';
import { OrdenesService } from './ordenes.service';

// F04: órdenes de servicio (Dueño y Técnico, AJ-03).
@Module({
  imports: [AuthModule], // JwtAuthGuard, RolesGuard
  controllers: [OrdenesController],
  providers: [OrdenesService],
})
export class OrdenesModule {}
