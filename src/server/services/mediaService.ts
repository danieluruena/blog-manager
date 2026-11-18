import type { Database } from "../db/client"
import {
  assignMediaToArticle,
  createMedia,
  deleteMediaById,
  deleteMediaByIds,
  findMediaById,
  findMediaByR2Keys,
  listMediaByArticle,
} from "../db/repositories/mediaRepository"
import type { Media } from "../db/schema"
import { nowIso } from "../lib/dates"
import { ApiError } from "../lib/errors"
import {
  detectImageMime,
  extensionForMime,
  extractMediaFilenames,
  isAllowedImageMime,
  MAX_IMAGE_BYTES,
  mediaKey,
} from "../lib/media"

const allowedFormatsMessage = "Formato no permitido. Usa JPEG, PNG, WebP, GIF o AVIF."

export async function storeImage(
  bucket: R2Bucket,
  db: Database,
  blogId: string,
  file: File,
): Promise<Media> {
  if (file.size === 0) {
    throw new ApiError(400, "EMPTY_FILE", "La imagen está vacía")
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new ApiError(413, "FILE_TOO_LARGE", "La imagen no puede superar los 5 MB")
  }

  if (!isAllowedImageMime(file.type)) {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", allowedFormatsMessage)
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const detected = detectImageMime(bytes)

  if (!detected) {
    throw new ApiError(415, "INVALID_IMAGE", "El archivo no parece una imagen válida")
  }

  if (detected !== file.type) {
    throw new ApiError(
      415,
      "MIME_MISMATCH",
      "El tipo declarado no coincide con el contenido de la imagen",
    )
  }

  const filename = `${crypto.randomUUID()}.${extensionForMime(detected)}`
  const key = mediaKey(blogId, filename)

  await bucket.put(key, bytes, {
    httpMetadata: {
      contentType: detected,
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: { blogId },
  })

  try {
    return await createMedia(db, {
      id: crypto.randomUUID(),
      blogId,
      r2Key: key,
      filename,
      mimeType: detected,
      sizeBytes: file.size,
      createdAt: nowIso(),
    })
  } catch (error) {
    await bucket.delete(key).catch(() => undefined)
    throw error
  }
}

export async function deleteBlogImage(
  bucket: R2Bucket,
  db: Database,
  blogId: string,
  mediaId: string,
): Promise<void> {
  const item = await findMediaById(db, blogId, mediaId)

  if (!item) {
    throw new ApiError(404, "NOT_FOUND", "Imagen no encontrada")
  }

  await bucket.delete(item.r2Key)
  await deleteMediaById(db, item.id)
}

export async function deleteMediaObjects(bucket: R2Bucket, keys: string[]): Promise<void> {
  for (let index = 0; index < keys.length; index += 1000) {
    await bucket.delete(keys.slice(index, index + 1000))
  }
}

/**
 * Devuelve las filas de `media` referenciadas en el markdown, sin validar
 * a qué artículo pertenecen.
 */
export async function findReferencedMedia(
  db: Database,
  blogId: string,
  body: string,
): Promise<Media[]> {
  const filenames = extractMediaFilenames(body, blogId)

  return findMediaByR2Keys(
    db,
    blogId,
    filenames.map((filename) => mediaKey(blogId, filename)),
  )
}

/**
 * Devuelve las filas de `media` referenciadas en el markdown. Si alguna
 * pertenece a otro artículo, rechaza el guardado para no compartir objetos.
 */
export async function resolveReferencedMedia(
  db: Database,
  blogId: string,
  articleId: string | null,
  body: string,
): Promise<Media[]> {
  const rows = await findReferencedMedia(db, blogId, body)

  const shared = rows.find((item) => item.articleId && item.articleId !== articleId)

  if (shared) {
    throw new ApiError(
      409,
      "MEDIA_IN_OTHER_ARTICLE",
      "Una imagen del artículo pertenece a otro artículo. Vuelve a subirla para usarla en este.",
    )
  }

  return rows
}

/**
 * Asigna al artículo las imágenes indicadas y elimina de R2 y D1 las que
 * ya no aparecen en el markdown (`keep`).
 */
export async function syncArticleMedia(
  bucket: R2Bucket,
  db: Database,
  blogId: string,
  articleId: string,
  media: { assign: Media[]; keep: Media[] },
): Promise<void> {
  const assignIds = new Set(media.assign.map((item) => item.id))
  const keepIds = new Set(media.keep.map((item) => item.id))

  await assignMediaToArticle(db, articleId, [...assignIds])

  const current = await listMediaByArticle(db, blogId, articleId)
  const removed = current.filter((item) => !keepIds.has(item.id))

  if (removed.length === 0) {
    return
  }

  await deleteMediaObjects(
    bucket,
    removed.map((item) => item.r2Key),
  )
  await deleteMediaByIds(
    db,
    removed.map((item) => item.id),
  )
}

export async function listArticleMediaKeys(
  db: Database,
  blogId: string,
  articleId: string,
): Promise<string[]> {
  const items = await listMediaByArticle(db, blogId, articleId)

  return items.map((item) => item.r2Key)
}
