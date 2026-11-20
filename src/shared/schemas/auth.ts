import { z } from "zod"

export const loginSchema = z.object({
  email: z.email("Introduce un email válido").max(254, "El email es demasiado largo"),
  password: z
    .string()
    .min(1, "Introduce tu contraseña")
    .max(200, "La contraseña es demasiado larga"),
})

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(120, "El nombre no puede superar los 120 caracteres"),
  email: z.email("Introduce un email válido").max(254, "El email es demasiado largo"),
  password: z
    .string()
    .min(12, "La contraseña debe tener al menos 12 caracteres")
    .max(200, "La contraseña es demasiado larga"),
})

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "El nombre es obligatorio")
      .max(120, "El nombre no puede superar los 120 caracteres"),
  })
  .strict()

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Introduce la contraseña actual"),
  newPassword: z
    .string()
    .min(12, "La nueva contraseña debe tener al menos 12 caracteres")
    .max(200, "La contraseña es demasiado larga"),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
