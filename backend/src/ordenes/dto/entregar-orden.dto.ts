import { IsString, Length } from 'class-validator';
import { TextoLimpio } from '../../clientes/dto/transformaciones';

// POST /ordenes/:id/entregar — SWR-ENT-003. Solo el nombre de quien recibe:
// sin documento de identidad (minimización de datos, Ley 1581 de 2012).
// Nunca va a los logs.
export class EntregarOrdenDto {
  @TextoLimpio()
  @Length(3, 100, {
    message: 'El nombre de quien recibe debe tener entre 3 y 100 caracteres',
  })
  @IsString({ message: 'El nombre de quien recibe es obligatorio' })
  recibidoPorNombre: string;
}
