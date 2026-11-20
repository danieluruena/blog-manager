import { registerSchema } from "@shared/schemas"
import { z } from "zod"

export const registerFormSchema = registerSchema
  .extend({
    confirmPassword: z.string().min(1, "Repite la contraseña"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  })

export type RegisterFormValues = z.infer<typeof registerFormSchema>
