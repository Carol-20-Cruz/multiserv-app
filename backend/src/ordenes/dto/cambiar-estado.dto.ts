import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TextoOpcional } from '../../clientes/dto/transformaciones';
import { EstadoOrden } from '../../generated/prisma/enums';

// POST /ordenes/:id/estado — SWR-ORD-011. Se envía el estado AL QUE se
// quiere pasar (no "avanzar"): así un doble clic pide el mismo estado dos
// veces y el segundo se rechaza con MISMO_ESTADO en vez de saltar uno.
export class CambiarEstadoDto {
  @IsEnum(EstadoOrden, { message: 'El estado nuevo no es válido' })
  estadoNuevo: EstadoOrden;

  @IsOptional()
  @TextoOpcional()
  @IsString()
  @MaxLength(300, { message: 'El comentario admite máximo 300 caracteres' })
  comentario?: string | null;
}
