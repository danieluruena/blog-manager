import { changePasswordSchema, updateProfileSchema } from "@shared/schemas"
import { z } from "zod"

export const profileFormSchema = updateProfileSchema

export const passwordFormSchema = changePasswordSchema
  .extend({
    confirmPassword: z.string().min(1, "Repite la nueva contraseña"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  })

export type ProfileFormValues = z.infer<typeof profileFormSchema>
export type PasswordFormValues = z.infer<typeof passwordFormSchema>
