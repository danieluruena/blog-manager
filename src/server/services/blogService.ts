import type { BlogCreateInput, BlogUpdateInput } from "@shared/schemas"

import type { Database } from "../db/client"
import type { Blog } from "../db/schema"
import {
  blogSlugExists,
  countArticlesForBlog,
  createBlog,
  deleteBlog,
  getBlogById,
  updateBlog,
} from "../db/repositories/blogsRepository"
import { nowIso } from "../lib/dates"
import { ApiError } from "../lib/errors"
import { findAvailableSlug, toSlug } from "../lib/slug"

function serializeAllowedOrigins(origins: string[]): string {
  return [...new Set(origins.map((origin) => new URL(origin).origin))].join(",")
}

export async function getBlogOrThrow(db: Database, blogId: string): Promise<Blog> {
  const blog = await getBlogById(db, blogId)

  if (!blog) {
    throw new ApiError(404, "NOT_FOUND", "Blog no encontrado")
  }

  return blog
}

export async function createBlogFromInput(db: Database, input: BlogCreateInput): Promise<Blog> {
  const baseSlug = input.slug ?? toSlug(input.name, 80)

  if (input.slug && (await blogSlugExists(db, baseSlug))) {
    throw new ApiError(409, "SLUG_DUPLICADO", "Ya existe un blog con ese slug")
  }

  const slug = input.slug
    ? baseSlug
    : await findAvailableSlug(baseSlug, (candidate) => blogSlugExists(db, candidate))
  const timestamp = nowIso()

  return createBlog(db, {
    id: crypto.randomUUID(),
    name: input.name,
    slug,
    description: input.description,
    siteUrl: input.siteUrl,
    allowedOrigins: serializeAllowedOrigins(input.allowedOrigins),
    isActive: input.isActive,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
}

export async function updateBlogFromInput(
  db: Database,
  blogId: string,
  input: BlogUpdateInput,
): Promise<Blog> {
  const blog = await getBlogOrThrow(db, blogId)

  if (input.slug && input.slug !== blog.slug) {
    if (await blogSlugExists(db, input.slug, blogId)) {
      throw new ApiError(409, "SLUG_DUPLICADO", "Ya existe un blog con ese slug")
    }
  }

  const updated = await updateBlog(db, blogId, {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.slug !== undefined ? { slug: input.slug } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.siteUrl !== undefined ? { siteUrl: input.siteUrl } : {}),
    ...(input.allowedOrigins !== undefined
      ? { allowedOrigins: serializeAllowedOrigins(input.allowedOrigins) }
      : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    updatedAt: nowIso(),
  })

  if (!updated) {
    throw new ApiError(404, "NOT_FOUND", "Blog no encontrado")
  }

  return updated
}

export async function deleteBlogOrThrow(db: Database, blogId: string): Promise<void> {
  await getBlogOrThrow(db, blogId)

  const articleCount = await countArticlesForBlog(db, blogId)

  if (articleCount > 0) {
    throw new ApiError(
      409,
      "BLOG_HAS_ARTICLES",
      "No se puede eliminar un blog con artículos. Desactívalo o elimina sus artículos primero.",
      { articleCount },
    )
  }

  const deleted = await deleteBlog(db, blogId)

  if (!deleted) {
    throw new ApiError(404, "NOT_FOUND", "Blog no encontrado")
  }
}
