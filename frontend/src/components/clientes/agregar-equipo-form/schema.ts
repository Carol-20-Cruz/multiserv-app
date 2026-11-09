import { z } from "zod";

// SWR-EQP-003: tipo de equipo y marca obligatorios; referencia y serial
// opcionales.
export const equipoSchema = z.object({
  tipoEquipoId: z.string().min(1, "El tipo de equipo es obligatorio"),
  marca: z
    .string()
    .trim()
    .min(1, "La marca es obligatoria")
    .max(60, "La marca admite máximo 60 caracteres"),
  referencia: z
    .string()
    .trim()
    .max(60, "La referencia admite máximo 60 caracteres"),
  serial: z.string().trim().max(60, "El serial admite máximo 60 caracteres"),
});

export type EquipoFormData = z.infer<typeof equipoSchema>;
