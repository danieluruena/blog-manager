import { z } from "zod"

import { blogPermissionValues, userRoleValues } from "../constants"

const userNameSchema = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio")
  .max(120, "El nombre no puede superar los 120 caracteres")

const userEmailSchema = z.email("Introduce un email válido").max(254, "El email es demasiado largo")

const userPasswordSchema = z
  .string()
  .min(12, "La contraseña debe tener al menos 12 caracteres")
  .max(200, "La contraseña es demasiado larga")

export const blogPermissionInputSchema = z.object({
  blogId: z.uuid(),
  permission: z.enum(blogPermissionValues, { message: "Permiso inválido" }),
})

export const adminUserCreateSchema = z.object({
  name: userNameSchema,
  email: userEmailSchema,
  password: userPasswordSchema,
  role: z.enum(userRoleValues, { message: "Rol inválido" }).default("editor"),
  isActive: z.boolean().default(true),
  isApproved: z.boolean().default(false),
  permissions: z.array(blogPermissionInputSchema).max(100).default([]),
})

export const adminUserUpdateSchema = z.object({
  name: userNameSchema.optional(),
  email: userEmailSchema.optional(),
  role: z.enum(userRoleValues, { message: "Rol inválido" }).optional(),
  isActive: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  permissions: z.array(blogPermissionInputSchema).max(100).optional(),
})

export type BlogPermissionInput = z.infer<typeof blogPermissionInputSchema>
export type AdminUserCreateInput = z.infer<typeof adminUserCreateSchema>
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>
