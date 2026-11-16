import { IsOptional, IsString, MaxLength, ValidateBy } from 'class-validator';
import { TextoOpcional } from '../../clientes/dto/transformaciones';
import { validarCantidadEntrada } from '../reglas/stock';

// POST /repuestos/:id/entradas — llegan repuestos del proveedor.
// La cantidad se valida con la regla pura (entero de 1 en adelante) y el
// mensaje de error es el que devuelve validarCantidadEntrada.
export class RegistrarEntradaDto {
  @ValidateBy({
    name: 'cantidadEntradaValida',
    validator: {
      validate: (valor: unknown) => validarCantidadEntrada(valor).valido,
      defaultMessage: (args) => {
        const resultado = validarCantidadEntrada(args?.value);
        return resultado.valido ? '' : resultado.mensaje;
      },
    },
  })
  cantidad: number;

  @IsOptional()
  @TextoOpcional()
  @IsString()
  @MaxLength(120, { message: 'El proveedor admite máximo 120 caracteres' })
  proveedor?: string | null;

  @IsOptional()
  @TextoOpcional()
  @IsString()
  @MaxLength(200, { message: 'El motivo admite máximo 200 caracteres' })
  motivo?: string | null;
}
