import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  PrimeraMayuscula,
  TextoLimpio,
} from '../../clientes/dto/transformaciones';
import { ReferenciaLimpia } from './transformaciones';

// POST /repuestos — SWR-INV-001 (solo Dueño, AJ-03) + AJ-05.
// Valores en COP sin decimales (SWR-CON-003).
export class CrearRepuestoDto {
  @TextoLimpio()
  @MaxLength(120, { message: 'El nombre admite máximo 120 caracteres' })
  @IsString({ message: 'El nombre es obligatorio' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @ReferenciaLimpia()
  @MaxLength(60, { message: 'La referencia admite máximo 60 caracteres' })
  @IsString({ message: 'La referencia es obligatoria' })
  @IsNotEmpty({ message: 'La referencia es obligatoria' })
  referencia: string;

  @PrimeraMayuscula() // "samsung" -> "Samsung"
  @MaxLength(60, { message: 'La marca compatible admite máximo 60 caracteres' })
  @IsString({ message: 'La marca compatible es obligatoria' })
  @IsNotEmpty({ message: 'La marca compatible es obligatoria' })
  marcaCompatible: string;

  // AJ-05: un solo tipo de equipo, obligatorio.
  @Type(() => Number)
  @IsInt({ message: 'El tipo de equipo es obligatorio' })
  @Min(1, { message: 'El tipo de equipo es obligatorio' })
  tipoEquipoId: number;

  @Type(() => Number)
  @IsInt({ message: 'El precio de venta debe ser un valor entero en pesos' })
  @Min(0, { message: 'El precio de venta no puede ser negativo' })
  precioVenta: number;

  // Stock inicial. Si es mayor que 0 queda como movimiento ENTRADA con
  // motivo "Stock inicial", para que todo el stock tenga historial.
  @Type(() => Number)
  @IsInt({ message: 'La cantidad inicial debe ser un número entero' })
  @Min(0, { message: 'La cantidad inicial no puede ser negativa' })
  cantidadInicial: number;

  // SWR-INV-009: por defecto 1; se permite 0.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La cantidad mínima debe ser un número entero' })
  @Min(0, { message: 'La cantidad mínima no puede ser negativa' })
  cantidadMinima?: number;
}
