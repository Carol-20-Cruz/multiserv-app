import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  SiLlega,
  TextoLimpio,
  TextoOpcional,
} from '../../clientes/dto/transformaciones';
import { Modalidad } from '../../generated/prisma/enums';

// PATCH /ordenes/:id — editar los datos de la recepción. Todo es opcional:
// solo se cambia lo que llegue. El cliente, el equipo, el número y el
// estado NO se editan aquí. La regla "DOMICILIO exige dirección" se revisa
// en el servicio con el resultado final (lo que llega + lo guardado).
export class ActualizarOrdenDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El responsable no es válido' })
  @Min(1, { message: 'El responsable no es válido' })
  responsableId?: number;

  @IsOptional()
  @IsEnum(Modalidad, { message: 'La modalidad debe ser TALLER o DOMICILIO' })
  modalidad?: Modalidad;

  @IsOptional()
  @TextoOpcional()
  @IsString()
  @MaxLength(200, {
    message: 'La dirección de la visita admite máximo 200 caracteres',
  })
  direccionVisita?: string | null;

  @IsOptional()
  @TextoOpcional()
  @IsDateString({}, { message: 'La fecha de la visita no es válida' })
  fechaVisita?: string | null;

  @SiLlega()
  @TextoLimpio()
  @MaxLength(500, {
    message: 'La falla reportada admite máximo 500 caracteres',
  })
  @IsString({ message: 'La falla reportada es obligatoria' })
  @IsNotEmpty({ message: 'La falla reportada es obligatoria' })
  fallaReportada?: string;

  @IsOptional()
  @TextoOpcional()
  @IsString()
  @MaxLength(300, { message: 'Los accesorios admiten máximo 300 caracteres' })
  accesorios?: string | null;

  @IsOptional()
  @TextoOpcional()
  @IsString()
  @MaxLength(300, {
    message: 'El estado del equipo admite máximo 300 caracteres',
  })
  estadoEquipo?: string | null;
}
