import { IsNotEmpty, IsString, MaxLength, ValidateBy } from 'class-validator';
import { TextoLimpio } from '../../clientes/dto/transformaciones';
import { validarValorCotizado } from '../reglas/cotizacion';

// PUT /ordenes/:id/cotizacion — registrar o corregir la cotización
// aprobada (SWR-PAY-004, AJ-09). El valor se valida con la regla pura y el
// mensaje de error es el que ella devuelve. aprobadaEn la pone el servidor.
export class RegistrarCotizacionDto {
  @TextoLimpio()
  @MaxLength(1000, {
    message: 'El diagnóstico admite máximo 1000 caracteres',
  })
  @IsString({ message: 'El diagnóstico es obligatorio' })
  @IsNotEmpty({ message: 'El diagnóstico es obligatorio' })
  diagnostico: string;

  @ValidateBy({
    name: 'valorCotizadoValido',
    validator: {
      validate: (valor: unknown) => validarValorCotizado(valor).valido,
      defaultMessage: (args) => {
        const resultado = validarValorCotizado(args?.value);
        return resultado.valido ? '' : resultado.mensaje;
      },
    },
  })
  valorCotizado: number;
}
