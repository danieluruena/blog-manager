import { z } from "zod"

import {
  booleanQuerySchema,
  blogSlugSchema,
  originSchema,
  pageSchema,
  pageSizeSchema,
  siteUrlSchema,
} from "./common"

const blogBaseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: blogSlugSchema.optional(),
  description: z.string().trim().max(500),
  siteUrl: siteUrlSchema,
  allowedOrigins: z.array(originSchema).max(20),
  isActive: z.boolean(),
})

export const blogCreateSchema = blogBaseSchema.extend({
  description: blogBaseSchema.shape.description.default(""),
  allowedOrigins: blogBaseSchema.shape.allowedOrigins.default([]),
  isActive: blogBaseSchema.shape.isActive.default(true),
})

export const blogUpdateSchema = blogBaseSchema.partial()

export const blogListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  active: booleanQuerySchema.optional(),
  page: pageSchema,
  pageSize: pageSizeSchema,
  sort: z.enum(["name", "updated_at", "created_at"]).default("updated_at"),
})

export type BlogCreateInput = z.infer<typeof blogCreateSchema>
export type BlogUpdateInput = z.infer<typeof blogUpdateSchema>
export type BlogListQuery = z.infer<typeof blogListQuerySchema>
