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
  ValidateIf,
} from 'class-validator';
import {
  TextoLimpio,
  TextoOpcional,
} from '../../clientes/dto/transformaciones';
import { Modalidad } from '../../generated/prisma/enums';

export const MENSAJE_DIRECCION_DOMICILIO =
  'La dirección de la visita es obligatoria para el servicio a domicilio';

// POST /ordenes — SWR-ORD-001: orden con cliente y equipo.
// El número, el estado inicial (RECIBIDO) y los valores de Configuracion
// los pone el servidor; no se aceptan del navegador.
export class CrearOrdenDto {
  @Type(() => Number)
  @IsInt({ message: 'El cliente es obligatorio' })
  @Min(1, { message: 'El cliente es obligatorio' })
  clienteId: number;

  @Type(() => Number)
  @IsInt({ message: 'El equipo es obligatorio' })
  @Min(1, { message: 'El equipo es obligatorio' })
  equipoId: number;

  // Si no llega, el responsable es quien crea la orden.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El responsable no es válido' })
  @Min(1, { message: 'El responsable no es válido' })
  responsableId?: number;

  @IsOptional()
  @IsEnum(Modalidad, { message: 'La modalidad debe ser TALLER o DOMICILIO' })
  modalidad?: Modalidad;

  // Obligatoria solo para DOMICILIO; en TALLER se ignora (queda null).
  @ValidateIf((o: CrearOrdenDto) => o.modalidad === Modalidad.DOMICILIO)
  @TextoOpcional()
  @MaxLength(200, {
    message: 'La dirección de la visita admite máximo 200 caracteres',
  })
  @IsString({ message: MENSAJE_DIRECCION_DOMICILIO })
  @IsNotEmpty({ message: MENSAJE_DIRECCION_DOMICILIO })
  direccionVisita?: string | null;

  @IsOptional()
  @TextoOpcional()
  @IsDateString({}, { message: 'La fecha de la visita no es válida' })
  fechaVisita?: string | null;

  @TextoLimpio()
  @MaxLength(500, {
    message: 'La falla reportada admite máximo 500 caracteres',
  })
  @IsString({ message: 'La falla reportada es obligatoria' })
  @IsNotEmpty({ message: 'La falla reportada es obligatoria' })
  fallaReportada: string;

  @IsOptional()
  @TextoOpcional()
  @IsString()
  @MaxLength(300, { message: 'Los accesorios admiten máximo 300 caracteres' })
  accesorios?: string | null;

  // Cómo llega el equipo (golpes, rayones...).
  @IsOptional()
  @TextoOpcional()
  @IsString()
  @MaxLength(300, {
    message: 'El estado del equipo admite máximo 300 caracteres',
  })
  estadoEquipo?: string | null;
}
