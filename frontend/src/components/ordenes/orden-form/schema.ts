import { z } from "zod";

// Validación en el navegador (avisa rápido; el backend decide).
// SWR-ORD-001: cliente, equipo y falla reportada son obligatorios; a
// domicilio, también la dirección. Mismos mensajes que los DTO del backend.

export const MENSAJE_CLIENTE = "El cliente es obligatorio";
export const MENSAJE_EQUIPO = "El equipo es obligatorio";
export const MENSAJE_FALLA = "La falla reportada es obligatoria";
export const MENSAJE_DIRECCION_DOMICILIO =
  "La dirección de la visita es obligatoria para el servicio a domicilio";

const textoOpcional = (max: number, campo: string) =>
  z.string().trim().max(max, `${campo} admite máximo ${max} caracteres`);

// editando: al editar no se cambia el cliente ni el equipo.
export const ordenSchema = (editando: boolean) =>
  z
    .object({
      clienteId: z.string(),
      equipoId: z.string(),
      responsableId: z.string(),
      modalidad: z.enum(["TALLER", "DOMICILIO"]),
      direccionVisita: textoOpcional(200, "La dirección de la visita"),
      fechaVisita: z.string(),
      fallaReportada: z
        .string()
        .trim()
        .min(1, MENSAJE_FALLA)
        .max(500, "La falla reportada admite máximo 500 caracteres"),
      accesorios: textoOpcional(300, "Los accesorios"),
      estadoEquipo: textoOpcional(300, "El estado del equipo"),
    })
    .superRefine((datos, ctx) => {
      if (!editando && !datos.clienteId) {
        ctx.addIssue({
          code: "custom",
          path: ["clienteId"],
          message: MENSAJE_CLIENTE,
        });
      }
      if (!editando && !datos.equipoId) {
        ctx.addIssue({
          code: "custom",
          path: ["equipoId"],
          message: MENSAJE_EQUIPO,
        });
      }
      if (datos.modalidad === "DOMICILIO" && !datos.direccionVisita) {
        ctx.addIssue({
          code: "custom",
          path: ["direccionVisita"],
          message: MENSAJE_DIRECCION_DOMICILIO,
        });
      }
    });

export type OrdenFormData = z.infer<ReturnType<typeof ordenSchema>>;
