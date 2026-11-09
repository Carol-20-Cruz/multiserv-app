import { errorTelefono, normalizarTelefono } from "@/lib/telefono";
import { z } from "zod";

// Validación en el navegador (avisa rápido; el backend decide).
// SWR-CLI-001: nombre y teléfono obligatorios.
// SWR-CLI-003 + AJ-08: 10 dígitos, se aceptan espacios y guiones.
// Ley 1581: la autorización de datos es obligatoria para registrar.

export const MENSAJE_AUTORIZACION =
  "Debes confirmar que el cliente autoriza el tratamiento de sus datos (Ley 1581)";

const telefonoObligatorio = z.string().superRefine((valor, ctx) => {
  const error = errorTelefono(valor);
  if (error) ctx.addIssue({ code: "custom", message: error });
});

const telefonoOpcional = z.string().superRefine((valor, ctx) => {
  if (normalizarTelefono(valor) === "") return;
  if (errorTelefono(valor)) {
    ctx.addIssue({
      code: "custom",
      message: "El teléfono alterno debe tener 10 dígitos",
    });
  }
});

const textoOpcional = (max: number, campo: string) =>
  z.string().trim().max(max, `${campo} admite máximo ${max} caracteres`);

export const clienteSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(120, "El nombre admite máximo 120 caracteres"),
  telefono: telefonoObligatorio,
  telefonoAlterno: telefonoOpcional,
  correo: z
    .string()
    .trim()
    .max(254)
    .refine(
      (valor) => valor === "" || z.email().safeParse(valor).success,
      "Ingresa un correo válido",
    ),
  direccion: textoOpcional(200, "La dirección"),
  barrio: textoOpcional(80, "El barrio"),
  ciudad: textoOpcional(80, "La ciudad"),
  autorizaDatos: z.boolean().refine((valor) => valor, MENSAJE_AUTORIZACION),
});

export type ClienteFormData = z.infer<typeof clienteSchema>;
