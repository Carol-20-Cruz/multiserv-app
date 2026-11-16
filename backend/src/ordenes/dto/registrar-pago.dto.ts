import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateBy,
} from 'class-validator';
import { TextoOpcional } from '../../clientes/dto/transformaciones';
import { MedioPago } from '../../generated/prisma/enums';
import { validarValorPago } from '../reglas/saldo';

// POST /ordenes/:id/pagos — SWR-PAY-004. Aquí solo se revisa el FORMATO
// del valor (400). Lo que depende de la orden (entregada, sin cotización,
// supera el saldo) lo decide el servicio con la fila bloqueada (409).
// El tipo (ABONO o SALDO) no lo envía el usuario: lo calcula el servidor.
export class RegistrarPagoDto {
  @ValidateBy({
    name: 'valorPagoValido',
    validator: {
      validate: (valor: unknown) => validarValorPago(valor).valido,
      defaultMessage: (args) => {
        const resultado = validarValorPago(args?.value);
        return resultado.valido ? '' : resultado.mensaje;
      },
    },
  })
  valor: number;

  @IsEnum(MedioPago, { message: 'El medio de pago no es válido' })
  medio: MedioPago;

  // Número de la transferencia, si lo hay. Nunca va a los logs.
  @IsOptional()
  @TextoOpcional()
  @IsString()
  @MaxLength(60, { message: 'La referencia admite máximo 60 caracteres' })
  referencia?: string | null;
}
