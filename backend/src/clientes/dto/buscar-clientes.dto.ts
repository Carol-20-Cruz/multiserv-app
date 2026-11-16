import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { TextoOpcional } from './transformaciones';

// GET /clientes?buscar=&pagina= — buscar por nombre o teléfono.
export class BuscarClientesDto {
  @IsOptional()
  @TextoOpcional()
  @IsString()
  @MaxLength(100)
  buscar?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero' })
  @Min(1, { message: 'La página debe ser 1 o mayor' })
  pagina?: number;
}
