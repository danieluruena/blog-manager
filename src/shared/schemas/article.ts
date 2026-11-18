import { z } from "zod"

import { articleStatusValues } from "../constants"
import {
  articleSlugSchema,
  booleanQuerySchema,
  isoDateSchema,
  pageSchema,
  pageSizeSchema,
} from "./common"

const articleBaseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: articleSlugSchema.optional(),
  excerpt: z.string().trim().max(300),
  author: z.string().trim().min(1).max(120),
  body: z.string().max(200_000),
  status: z.enum(articleStatusValues),
  publishedAt: isoDateSchema.nullable().optional(),
})

export const articleCreateSchema = articleBaseSchema.extend({
  excerpt: articleBaseSchema.shape.excerpt.default(""),
  body: articleBaseSchema.shape.body.default(""),
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
