import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TextoOpcional } from '../../clientes/dto/transformaciones';
import { EstadoOrden } from '../../generated/prisma/enums';

// GET /ordenes?buscar=&estado=&pagina=
export class BuscarOrdenesDto {
  // Por número de orden, nombre o teléfono del cliente.
  @IsOptional()
  @TextoOpcional()
  @IsString()
  @MaxLength(100)
  buscar?: string | null;

  @IsOptional()
  @IsEnum(EstadoOrden, { message: 'El estado no es válido' })
  estado?: EstadoOrden;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero' })
  @Min(1, { message: 'La página debe ser 1 o mayor' })
  pagina?: number;
}
