import { z } from "zod"

export const loginSchema = z.object({
  email: z.email("Introduce un email válido").max(254, "El email es demasiado largo"),
  password: z
    .string()
    .min(1, "Introduce tu contraseña")
    .max(200, "La contraseña es demasiado larga"),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Introduce la contraseña actual"),
  newPassword: z
    .string()
    .min(12, "La nueva contraseña debe tener al menos 12 caracteres")
    .max(200, "La contraseña es demasiado larga"),
})

export type LoginInput = z.infer<typeof loginSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
