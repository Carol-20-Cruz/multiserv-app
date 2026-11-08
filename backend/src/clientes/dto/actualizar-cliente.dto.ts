import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  EsTelefono,
  SiLlega,
  TextoLimpio,
  TextoOpcional,
} from './transformaciones';

// PATCH /clientes/:id — editar datos de contacto. Todo es opcional: solo se
// cambia lo que llegue. La autorización de datos no se edita aquí.
export class ActualizarClienteDto {
  @SiLlega()
  @TextoLimpio()
  @MaxLength(120, { message: 'El nombre admite máximo 120 caracteres' })
  @IsString({ message: 'El nombre es obligatorio' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre?: string;

  // SWR-CLI-003 + AJ-08. Si cambia, se vuelve a revisar el duplicado.
  @SiLlega()
  @EsTelefono()
  telefono?: string;

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
}
