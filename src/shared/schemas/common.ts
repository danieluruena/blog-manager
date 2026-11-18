import { z } from "zod"

export const idSchema = z.uuid()

export const blogSlugSchema = z
  .string()
  .trim()
  .min(1, "El slug es obligatorio")
  .max(80, "El slug no puede superar los 80 caracteres")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El slug solo admite minúsculas, números y guiones")

export const articleSlugSchema = z
  .string()
  .trim()
  .min(1, "El slug es obligatorio")
  .max(200, "El slug no puede superar los 200 caracteres")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El slug solo admite minúsculas, números y guiones")

export const siteUrlSchema = z
  .url("Introduce una URL válida")
  .max(500, "La URL es demasiado larga")
  .refine((value) => {
    const protocol = new URL(value).protocol
    return protocol === "http:" || protocol === "https:"
  }, "La URL debe usar http o https")

export const originSchema = z
  .string()
  .trim()
  .max(255)
  .refine((value) => {
    try {
      const url = new URL(value)
      const protocol = url.protocol
      const normalized = value.replace(/\/$/, "")
      return (protocol === "http:" || protocol === "https:") && url.origin === normalized
    } catch {
      return false
    }
  }, "El origen debe tener el formato https://ejemplo.com")

export const allowedOriginsSchema = z
  .array(originSchema)
  .max(20, "Puedes configurar como máximo 20 orígenes")
  .default([])

export const pageSchema = z.coerce.number().int().min(1).default(1)
export const pageSizeSchema = z.coerce.number().int().min(1).max(100).default(20)

export const booleanQuerySchema = z.enum(["true", "false"]).transform((value) => value === "true")

export const isoDateSchema = z.iso.datetime({ offset: true })
