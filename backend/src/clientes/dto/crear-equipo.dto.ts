import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TextoLimpio, TextoOpcional } from './transformaciones';

// POST /clientes/:id/equipos — SWR-EQP-003.
// Tipo de equipo y marca obligatorios; referencia y serial opcionales.
export class CrearEquipoDto {
  @Type(() => Number)
  @IsInt({ message: 'El tipo de equipo es obligatorio' })
  @Min(1, { message: 'El tipo de equipo es obligatorio' })
  tipoEquipoId: number;

  @TextoLimpio()
  @MaxLength(60, { message: 'La marca admite máximo 60 caracteres' })
  @IsString({ message: 'La marca es obligatoria' })
  @IsNotEmpty({ message: 'La marca es obligatoria' })
  marca: string;

  @IsOptional()
  @TextoOpcional()
  @IsString()
  @MaxLength(60, { message: 'La referencia admite máximo 60 caracteres' })
  referencia?: string | null;

  @IsOptional()
  @TextoOpcional()
  @IsString()
  @MaxLength(60, { message: 'El serial admite máximo 60 caracteres' })
  serial?: string | null;
}
