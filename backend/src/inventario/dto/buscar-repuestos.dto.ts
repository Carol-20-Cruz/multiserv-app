import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TextoOpcional } from '../../clientes/dto/transformaciones';

// GET /repuestos?buscar=&tipoEquipoId=&soloStockBajo=&pagina=
export class BuscarRepuestosDto {
  // Por nombre o referencia.
  @IsOptional()
  @TextoOpcional()
  @IsString()
  @MaxLength(100)
  buscar?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El tipo de equipo no es válido' })
  @Min(1, { message: 'El tipo de equipo no es válido' })
  tipoEquipoId?: number;

  // SWR-INV-009: "1" o "true" -> solo los que están en existencia baja.
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === '1' || value === 'true' || value === true
      ? true
      : value === '0' || value === 'false' || value === false
        ? false
        : value,
  )
  @IsBoolean({ message: 'soloStockBajo debe ser 1 o 0' })
  soloStockBajo?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero' })
  @Min(1, { message: 'La página debe ser 1 o mayor' })
  pagina?: number;
}
