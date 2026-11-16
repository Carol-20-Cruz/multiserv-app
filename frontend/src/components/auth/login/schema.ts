import { z } from "zod";

// Validación en el navegador antes de enviar (SWR-AUTH-001):
// ni el correo ni la contraseña pueden ir vacíos.
export const loginSchema = z.object({
  correo: z
    .string()
    .trim()
    .min(1, "El correo es obligatorio")
    .email("Ingresa un correo válido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
