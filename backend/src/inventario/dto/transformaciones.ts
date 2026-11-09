import { Transform } from 'class-transformer';

// Referencia del repuesto: sin espacios en los extremos, un solo espacio
// entre palabras y en MAYÚSCULAS ("bn44-00932a " -> "BN44-00932A"), para
// que la misma referencia escrita distinto no se registre dos veces.
export const ReferenciaLimpia = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-CO')
      : value,
  );
