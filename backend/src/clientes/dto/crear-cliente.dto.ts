import {
  Equals,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { EsTelefono, TextoLimpio, TextoOpcional } from './transformaciones';

// POST /clientes — SWR-CLI-001, SWR-CLI-003 y Ley 1581.
export class CrearClienteDto {
  // SWR-CLI-001: nombre obligatorio.
  @TextoLimpio()
  @MaxLength(120, { message: 'El nombre admite máximo 120 caracteres' })
  @IsString({ message: 'El nombre es obligatorio' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  // SWR-CLI-001 + SWR-CLI-003 + AJ-08.
  @EsTelefono()
  telefono: string;

  @IsOptional()
  @EsTelefono({
    opcional: true,
    message: 'El teléfono alterno debe tener 10 dígitos',
  })
  telefonoAlterno?: string | null;

  @IsOptional()
  @TextoOpcional()
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  @MaxLength(254)
  correo?: string | null;

  @IsOptional()
  @TextoOpcional()
  @IsString()
  @MaxLength(200)
  direccion?: string | null;

  @IsOptional()
  @TextoOpcional()
  @IsString()
  @MaxLength(80)
  barrio?: string | null;

  @IsOptional()
  @TextoOpcional()
  @IsString()
  @MaxLength(80)
  ciudad?: string | null;

  // Ley 1581 de 2012: sin autorización no se registra el cliente.
  // La fecha la pone el servidor (fechaAutorizacion), no el navegador.
  @IsBoolean({
    message: 'Debe indicar la autorización de tratamiento de datos',
  })
  @Equals(true, {
    message: 'El cliente debe autorizar el tratamiento de sus datos (Ley 1581)',
  })
  autorizaDatos: boolean;
}
