import { Transform } from 'class-transformer';
import {
  ValidateBy,
  ValidateIf,
  type ValidationOptions,
} from 'class-validator';
import {
  alternoIgualAlPrincipal,
  MENSAJE_ALTERNO_IGUAL,
  normalizarTelefono,
  validarTelefono,
} from '../reglas/telefono';

// Defecto 6: el teléfono alterno no puede ser el mismo número que el
// principal (comparados ya normalizados). Solo revisa cuando llegan los dos
// en el mismo cuerpo; al editar, el servicio compara con lo guardado.
export const AlternoDistinto = () =>
  ValidateBy({
    name: 'alternoDistinto',
    validator: {
      validate: (alterno: unknown, args) =>
        !alternoIgualAlPrincipal(
          (args?.object as { telefono?: unknown }).telefono,
          alterno,
        ),
      defaultMessage: () => MENSAJE_ALTERNO_IGUAL,
    },
  });

// Texto obligatorio: quita espacios de los extremos y deja uno solo entre
// palabras ("  Juan   Pérez " -> "Juan Pérez").
export const TextoLimpio = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  );

// Como TextoLimpio y además pone la PRIMERA letra en mayúscula, sin tocar
// el resto: "samsung" -> "Samsung", "LG" -> "LG", "hisense" -> "Hisense".
export const PrimeraMayuscula = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const limpio = value.trim().replace(/\s+/g, ' ');
    return limpio.charAt(0).toLocaleUpperCase('es-CO') + limpio.slice(1);
  });

// Texto opcional: igual que TextoLimpio, pero "" se guarda como null
// (así, al editar, borrar el campo lo deja vacío en la base de datos).
export const TextoOpcional = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const limpio = value.trim().replace(/\s+/g, ' ');
    return limpio === '' ? null : limpio;
  });

// Campo que puede omitirse en un PATCH, pero que si llega no puede ser
// null (nombre, teléfono): a diferencia de @IsOptional, null sí se valida.
export const SiLlega = () =>
  ValidateIf((_objeto, valor: unknown) => valor !== undefined);

// Teléfono: normaliza (AJ-08) y valida con la regla pura (SWR-CLI-003).
// El mensaje de error es el que devuelve validarTelefono.
// opcional: true -> un teléfono vacío ("" o solo espacios) se guarda como null.
export function EsTelefono(
  opciones: ValidationOptions & { opcional?: boolean } = {},
): PropertyDecorator {
  const { opcional = false, ...opcionesValidacion } = opciones;
  const normalizar = Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const limpio = normalizarTelefono(value);
    return opcional && limpio === '' ? null : limpio;
  });
  const validar = ValidateBy(
    {
      name: 'telefonoValido',
      validator: {
        validate: (valor: unknown) => validarTelefono(valor).valido,
        defaultMessage: (args) => {
          const resultado = validarTelefono(args?.value);
          return resultado.valido ? '' : resultado.mensaje;
        },
      },
    },
    opcionesValidacion,
  );
  return (objetivo, propiedad) => {
    normalizar(objetivo, propiedad);
    validar(objetivo, propiedad);
  };
}
