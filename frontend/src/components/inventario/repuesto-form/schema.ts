import { esEnteroTexto } from "@/lib/dinero";
import { z } from "zod";

// Validación en el navegador (avisa rápido; el backend decide).
// SWR-INV-001 + AJ-05: nombre, referencia, marca compatible, tipo de equipo,
// precio y cantidades obligatorios. Pesos sin decimales (SWR-CON-003); se
// aceptan puntos de miles ("180.000").

const enteroNoNegativo = (obligatorio: string, invalido: string) =>
  z.string().trim().min(1, obligatorio).refine(esEnteroTexto, invalido);

const texto = (max: number, obligatorio: string, campo: string) =>
  z
    .string()
    .trim()
    .min(1, obligatorio)
    .max(max, `${campo} admite máximo ${max} caracteres`);

export const repuestoSchema = z.object({
  nombre: texto(120, "El nombre es obligatorio", "El nombre"),
  referencia: texto(60, "La referencia es obligatoria", "La referencia"),
  marcaCompatible: texto(
    60,
    "La marca compatible es obligatoria",
    "La marca compatible",
  ),
  tipoEquipoId: z.string().min(1, "El tipo de equipo es obligatorio"),
  precioVenta: enteroNoNegativo(
    "El precio de venta es obligatorio",
    "El precio de venta debe ser un valor entero en pesos",
  ),
  // Solo al registrar; al editar la cantidad no se toca.
  cantidadInicial: enteroNoNegativo(
    "La cantidad inicial es obligatoria",
    "La cantidad inicial debe ser un número entero (0 o más)",
  ),
  // SWR-INV-009: por defecto 1; se permite 0.
  cantidadMinima: enteroNoNegativo(
    "La cantidad mínima es obligatoria",
    "La cantidad mínima debe ser un número entero (0 o más)",
  ),
});

export type RepuestoFormData = z.infer<typeof repuestoSchema>;
