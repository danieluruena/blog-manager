import { blogPermissionValues, userRoleValues } from "@shared/constants"
import { z } from "zod"

const nameSchema = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio")
  .max(120, "El nombre no puede superar los 120 caracteres")

const emailSchema = z.email("Introduce un email válido").max(254, "El email es demasiado largo")

const permissionsSchema = z
  .array(
    z.object({
      blogId: z.uuid(),
      permission: z.enum(blogPermissionValues),
    }),
  )
  .max(100)

const baseSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: z.string().max(200),
  confirmPassword: z.string().max(200),
  role: z.enum(userRoleValues, { message: "Rol inválido" }),
  isActive: z.boolean(),
  isApproved: z.boolean(),
  permissions: permissionsSchema,
})

export function buildUserFormSchema(isEdit: boolean) {
  return baseSchema.superRefine((values, ctx) => {
    if (!isEdit && values.password.length < 12) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "La contraseña debe tener al menos 12 caracteres",
      })
    }

    if (!isEdit && values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Las contraseñas no coinciden",
      })
    }

    if (values.role !== "admin" && values.isApproved && values.permissions.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["permissions"],
        message: "Un usuario aprobado debe tener al menos un permiso de blog",
      })
    }
  })
}

export type UserFormValues = z.infer<ReturnType<typeof buildUserFormSchema>>
