import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ClientesModule } from './clientes/clientes.module';
import { InventarioModule } from './inventario/inventario.module';
import { OrdenesModule } from './ordenes/ordenes.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ClientesModule,
    InventarioModule,
    OrdenesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
