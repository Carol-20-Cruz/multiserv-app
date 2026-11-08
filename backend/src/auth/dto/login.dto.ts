import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Datos que llegan a POST /auth/login — SWR-AUTH-001.
// El ValidationPipe global rechaza (400) lo que no cumpla estas reglas
// y cualquier campo extra que no esté declarado aquí.
export class LoginDto {
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  @MaxLength(254)
  correo: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MaxLength(72) // límite de bcrypt
  password: string;
}
