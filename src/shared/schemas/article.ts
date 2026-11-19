import { z } from "zod"

import { articleStatusValues } from "../constants"
import {
  articleSlugSchema,
  booleanQuerySchema,
  isoDateSchema,
  pageSchema,
  pageSizeSchema,
} from "./common"

const coverImageSchema = z
  .string()
  .trim()
  .max(2048, "La URL de la portada es demasiado larga")
  .refine(
    (value) => value === "" || /^https?:\/\//i.test(value) || value.startsWith("/"),
    "La URL de la portada no es válida",
  )
  .nullable()

const articleBaseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "El título es obligatorio")
    .max(200, "El título no puede superar los 200 caracteres"),
  slug: articleSlugSchema.optional(),
  excerpt: z.string().trim().max(300, "El resumen no puede superar los 300 caracteres"),
  author: z
    .string()
    .trim()
    .min(1, "El autor es obligatorio")
    .max(120, "El autor no puede superar los 120 caracteres"),
  bodyJson: z
    .string()
    .min(1, "El contenido es obligatorio")
    .max(1_000_000, "El contenido es demasiado largo"),
  coverImage: coverImageSchema,
  status: z.enum(articleStatusValues, { message: "Estado inválido" }),
  publishedAt: isoDateSchema.nullable().optional(),
})

export const articleCreateSchema = articleBaseSchema.extend({
  excerpt: articleBaseSchema.shape.excerpt.default(""),
  coverImage: articleBaseSchema.shape.coverImage.default(null),
  status: articleBaseSchema.shape.status.default("draft"),
})

export const articleUpdateSchema = articleBaseSchema.partial()

export const articleListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(articleStatusValues).optional(),
  page: pageSchema,
  pageSize: pageSizeSchema,
  sort: z.enum(["updated_at", "published_at", "created_at", "title"]).default("updated_at"),
})

export const publicArticleListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  cursor: z.string().max(500).optional(),
  featured: booleanQuerySchema.optional(),
})

export type ArticleCreateInput = z.infer<typeof articleCreateSchema>
export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>
export type ArticleListQuery = z.infer<typeof articleListQuerySchema>
export type PublicArticleListQuery = z.infer<typeof publicArticleListQuerySchema>
