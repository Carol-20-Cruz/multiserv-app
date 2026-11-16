import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';
import {
  PrimeraMayuscula,
  SiLlega,
  TextoLimpio,
} from '../../clientes/dto/transformaciones';
import { ReferenciaLimpia } from './transformaciones';

// PATCH /repuestos/:id — solo cambia lo que llegue.
// La cantidad NO se edita aquí: solo cambia con el stock inicial y con
// "Registrar entrada" (POST /repuestos/:id/entradas), para que quede historial.
// Si llega "cantidad", el ValidationPipe la rechaza (forbidNonWhitelisted).
export class ActualizarRepuestoDto {
  @SiLlega()
  @TextoLimpio()
  @MaxLength(120, { message: 'El nombre admite máximo 120 caracteres' })
  @IsString({ message: 'El nombre es obligatorio' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre?: string;

  // Si cambia, se vuelve a revisar el duplicado.
  @SiLlega()
  @ReferenciaLimpia()
  @MaxLength(60, { message: 'La referencia admite máximo 60 caracteres' })
  @IsString({ message: 'La referencia es obligatoria' })
  @IsNotEmpty({ message: 'La referencia es obligatoria' })
  referencia?: string;

  @SiLlega()
  @PrimeraMayuscula()
  @MaxLength(60, { message: 'La marca compatible admite máximo 60 caracteres' })
  @IsString({ message: 'La marca compatible es obligatoria' })
  @IsNotEmpty({ message: 'La marca compatible es obligatoria' })
  marcaCompatible?: string;

  // AJ-05.
  @SiLlega()
  @Type(() => Number)
  @IsInt({ message: 'El tipo de equipo es obligatorio' })
  @Min(1, { message: 'El tipo de equipo es obligatorio' })
  tipoEquipoId?: number;

  @SiLlega()
  @Type(() => Number)
  @IsInt({ message: 'El precio de venta debe ser un valor entero en pesos' })
  @Min(0, { message: 'El precio de venta no puede ser negativo' })
  precioVenta?: number;

  // SWR-INV-009: cambiar el mínimo puede encender la alerta.
  @SiLlega()
  @Type(() => Number)
  @IsInt({ message: 'La cantidad mínima debe ser un número entero' })
  @Min(0, { message: 'La cantidad mínima no puede ser negativa' })
  cantidadMinima?: number;
}
