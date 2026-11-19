import type { ArticleCreateInput, ArticleUpdateInput } from "@shared/schemas"

import type { Database } from "../db/client"
import type { Article, ArticleStatus, Media } from "../db/schema"
import {
  articleSlugExists,
  createArticle,
  deleteArticle,
  getArticleByBlogAndId,
  updateArticle,
} from "../db/repositories/articlesRepository"
import { deleteMediaByIds } from "../db/repositories/mediaRepository"
import { normalizeIso, nowIso } from "../lib/dates"
import { ApiError } from "../lib/errors"
import { renderArticleHtml } from "../lib/richtext"
import { findAvailableSlug, toSlug } from "../lib/slug"
import { getBlogOrThrow } from "./blogService"
import {
  deleteMediaObjects,
  findReferencedMedia,
  listArticleMediaKeys,
  resolveReferencedMedia,
  syncArticleMedia,
} from "./mediaService"

function isVisibleStatus(status: ArticleStatus): boolean {
  return status === "published" || status === "featured"
}

function uniqueMedia(items: Media[]): Media[] {
  return [...new Map(items.map((item) => [item.id, item])).values()]
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
  bucket: R2Bucket,
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
  const bodyHtml = renderArticleHtml(input.bodyJson)
  const coverImage = input.coverImage?.trim() || null
  const bodyMedia = await resolveReferencedMedia(db, blogId, null, bodyHtml)
  const coverMedia = coverImage ? await resolveReferencedMedia(db, blogId, null, coverImage) : []
  const referencedMedia = uniqueMedia([...bodyMedia, ...coverMedia])

  const article = await createArticle(db, {
    id: crypto.randomUUID(),
    blogId,
    title: input.title,
    slug,
    excerpt: input.excerpt,
    author: input.author,
    body: bodyHtml,
    bodyJson: input.bodyJson,
    coverImage,
    status: input.status,
    publishedAt: resolvePublishedAt(input.status, input.publishedAt, null),
    createdAt: timestamp,
    updatedAt: timestamp,
  })

  await syncMediaSafely(bucket, db, blogId, article.id, {
    assign: referencedMedia,
    keep: referencedMedia,
  })

  return article
}

export async function updateArticleForBlog(
  db: Database,
  blogId: string,
  articleId: string,
  input: ArticleUpdateInput,
  bucket: R2Bucket,
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
  const bodyHtml = input.bodyJson !== undefined ? renderArticleHtml(input.bodyJson) : null
  const coverImage =
    input.coverImage !== undefined ? input.coverImage?.trim() || null : article.coverImage
  const mediaChanged = bodyHtml !== null || input.coverImage !== undefined
  let mediaSync: { assign: Media[]; keep: Media[] } | null = null

  if (mediaChanged) {
    const previousBodyMedia = await findReferencedMedia(db, blogId, article.body)
    const previousCoverMedia = article.coverImage
      ? await findReferencedMedia(db, blogId, article.coverImage)
      : []
    const nextBodyMedia =
      bodyHtml !== null
        ? await resolveReferencedMedia(db, blogId, article.id, bodyHtml)
        : await findReferencedMedia(db, blogId, article.body)
    const nextCoverMedia =
      input.coverImage !== undefined
        ? coverImage
          ? await resolveReferencedMedia(db, blogId, article.id, coverImage)
          : []
        : coverImage
          ? await findReferencedMedia(db, blogId, coverImage)
          : []
    const assignablePrevious = uniqueMedia([...previousBodyMedia, ...previousCoverMedia]).filter(
      (item) => !item.articleId || item.articleId === article.id,
    )

    mediaSync = {
      assign: uniqueMedia([...assignablePrevious, ...nextBodyMedia, ...nextCoverMedia]),
      keep: uniqueMedia([...nextBodyMedia, ...nextCoverMedia]),
    }
  }

  const updated = await updateArticle(db, blogId, articleId, {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.slug !== undefined ? { slug: input.slug } : {}),
    ...(input.excerpt !== undefined ? { excerpt: input.excerpt } : {}),
    ...(input.author !== undefined ? { author: input.author } : {}),
    ...(bodyHtml !== null ? { body: bodyHtml, bodyJson: input.bodyJson } : {}),
    ...(input.coverImage !== undefined ? { coverImage } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.publishedAt !== undefined || isVisibleStatus(status)
      ? { publishedAt: resolvePublishedAt(status, input.publishedAt, article.publishedAt) }
      : {}),
    updatedAt: nowIso(),
  })

  if (!updated) {
    throw new ApiError(404, "NOT_FOUND", "Artículo no encontrado")
  }

  if (mediaSync) {
    await syncMediaSafely(bucket, db, blogId, article.id, mediaSync)
  }

  return updated
}

export async function deleteArticleForBlog(
  db: Database,
  blogId: string,
  articleId: string,
  bucket: R2Bucket,
): Promise<void> {
  const article = await getArticleByBlogAndId(db, blogId, articleId)

  if (!article) {
    throw new ApiError(404, "NOT_FOUND", "Artículo no encontrado")
  }

  const mediaKeys = await listArticleMediaKeys(db, blogId, article.id)
  const bodyMedia = await findReferencedMedia(db, blogId, article.body)
  const coverMedia = article.coverImage
    ? await findReferencedMedia(db, blogId, article.coverImage)
    : []
  const unassignedMedia = uniqueMedia([...bodyMedia, ...coverMedia]).filter(
    (item) => !item.articleId,
  )
  const keysToDelete = [...new Set([...mediaKeys, ...unassignedMedia.map((item) => item.r2Key)])]
  const deleted = await deleteArticle(db, blogId, article.id)

  if (!deleted) {
    throw new ApiError(404, "NOT_FOUND", "Artículo no encontrado")
  }

  if (keysToDelete.length > 0) {
    try {
      await deleteMediaObjects(bucket, keysToDelete)
      await deleteMediaByIds(
        db,
        unassignedMedia.map((item) => item.id),
      )
    } catch (error) {
      console.error("No se pudieron borrar las imágenes del artículo", error)
    }
  }
}

async function syncMediaSafely(
  bucket: R2Bucket,
  db: Database,
  blogId: string,
  articleId: string,
  media: { assign: Media[]; keep: Media[] },
): Promise<void> {
  try {
    await syncArticleMedia(bucket, db, blogId, articleId, media)
  } catch (error) {
    console.error("No se pudieron sincronizar las imágenes del artículo", error)
  }
}
