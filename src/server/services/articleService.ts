import type { ArticleCreateInput, ArticleUpdateInput } from "@shared/schemas"

import type { Database } from "../db/client"
import type { Article, ArticleStatus } from "../db/schema"
import {
  articleSlugExists,
  createArticle,
  deleteArticle,
  getArticleByBlogAndId,
  updateArticle,
} from "../db/repositories/articlesRepository"
import { normalizeIso, nowIso } from "../lib/dates"
import { ApiError } from "../lib/errors"
import { findAvailableSlug, toSlug } from "../lib/slug"
import { getBlogOrThrow } from "./blogService"

function isVisibleStatus(status: ArticleStatus): boolean {
  return status === "published" || status === "featured"
}

function resolvePublishedAt(
  status: ArticleStatus,
  publishedAt: string | null | undefined,
  currentPublishedAt: string | null,
): string | null {
  if (publishedAt !== undefined) {
    const normalized = normalizeIso(publishedAt)

    if (normalized) {
      return normalized
    }

    if (isVisibleStatus(status)) {
      return currentPublishedAt ?? nowIso()
    }

    return currentPublishedAt
  }

  if (isVisibleStatus(status) && !currentPublishedAt) {
    return nowIso()
  }

  return currentPublishedAt
}

export async function createArticleForBlog(
  db: Database,
  blogId: string,
  input: ArticleCreateInput,
): Promise<Article> {
  await getBlogOrThrow(db, blogId)

  const baseSlug = input.slug ?? toSlug(input.title, 200)

  if (input.slug && (await articleSlugExists(db, blogId, baseSlug))) {
    throw new ApiError(409, "SLUG_DUPLICADO", "Ya existe un artículo con ese slug en este blog")
  }

  const slug = input.slug
    ? baseSlug
    : await findAvailableSlug(baseSlug, (candidate) => articleSlugExists(db, blogId, candidate))
  const timestamp = nowIso()

  return createArticle(db, {
    id: crypto.randomUUID(),
    blogId,
    title: input.title,
    slug,
    excerpt: input.excerpt,
    author: input.author,
    body: input.body,
    status: input.status,
    publishedAt: resolvePublishedAt(input.status, input.publishedAt, null),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
}

export async function updateArticleForBlog(
  db: Database,
  blogId: string,
  articleId: string,
  input: ArticleUpdateInput,
): Promise<Article> {
  const article = await getArticleByBlogAndId(db, blogId, articleId)

  if (!article) {
    throw new ApiError(404, "NOT_FOUND", "Artículo no encontrado")
  }

  if (input.slug && input.slug !== article.slug) {
    if (await articleSlugExists(db, blogId, input.slug, articleId)) {
      throw new ApiError(409, "SLUG_DUPLICADO", "Ya existe un artículo con ese slug en este blog")
    }
  }

  const status = input.status ?? article.status
  const updated = await updateArticle(db, blogId, articleId, {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.slug !== undefined ? { slug: input.slug } : {}),
    ...(input.excerpt !== undefined ? { excerpt: input.excerpt } : {}),
    ...(input.author !== undefined ? { author: input.author } : {}),
    ...(input.body !== undefined ? { body: input.body } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.publishedAt !== undefined || isVisibleStatus(status)
      ? { publishedAt: resolvePublishedAt(status, input.publishedAt, article.publishedAt) }
      : {}),
    updatedAt: nowIso(),
  })

  if (!updated) {
    throw new ApiError(404, "NOT_FOUND", "Artículo no encontrado")
  }

  return updated
}

export async function deleteArticleForBlog(
  db: Database,
  blogId: string,
  articleId: string,
): Promise<void> {
  const deleted = await deleteArticle(db, blogId, articleId)

  if (!deleted) {
    throw new ApiError(404, "NOT_FOUND", "Artículo no encontrado")
  }
}
