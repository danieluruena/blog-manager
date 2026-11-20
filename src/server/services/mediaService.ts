import { uploadImageMimeType, uploadVideoMimeType } from "@shared/constants"

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
  extractMediaFilenames,
  isWebm,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  mediaKey,
} from "../lib/media"

const allowedFormatsMessage =
  "Solo se admiten imágenes WebP y vídeos WebM optimizados. Vuelve a añadir el archivo desde el editor."

export async function storeMedia(
  bucket: R2Bucket,
  db: Database,
  blogId: string,
  file: File,
): Promise<Media> {
  if (file.size === 0) {
    throw new ApiError(400, "EMPTY_FILE", "El archivo está vacío")
  }

  const isImage = file.type === uploadImageMimeType
  const isVideo = file.type === uploadVideoMimeType

  if (!isImage && !isVideo) {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", allowedFormatsMessage)
  }

  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES

  if (file.size > maxBytes) {
    throw new ApiError(
      413,
      "FILE_TOO_LARGE",
      isVideo ? "El vídeo no puede superar los 50 MB" : "La imagen no puede superar los 5 MB",
    )
  }

  const header = new Uint8Array(await file.slice(0, 32).arrayBuffer())

  if (isImage && detectImageMime(header) !== uploadImageMimeType) {
    throw new ApiError(415, "INVALID_IMAGE", "El archivo no es un WebP válido")
  }

  if (isVideo && !isWebm(header)) {
    throw new ApiError(415, "INVALID_VIDEO", "El archivo no es un WebM válido")
  }

  const extension = isVideo ? "webm" : "webp"
  const filename = `${crypto.randomUUID()}.${extension}`
  const key = mediaKey(blogId, filename)
  const mimeType = isVideo ? uploadVideoMimeType : uploadImageMimeType

  await bucket.put(key, file.stream(), {
    httpMetadata: {
      contentType: mimeType,
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: { blogId, kind: isVideo ? "video" : "image" },
  })

  try {
    return await createMedia(db, {
      id: crypto.randomUUID(),
      blogId,
      r2Key: key,
      filename,
      mimeType,
      sizeBytes: file.size,
      createdAt: nowIso(),
    })
  } catch (error) {
    await bucket.delete(key).catch(() => undefined)
    throw error
  }
}

export async function deleteBlogMedia(
  bucket: R2Bucket,
  db: Database,
  blogId: string,
  mediaId: string,
  origin?: string,
): Promise<void> {
  const item = await findMediaById(db, blogId, mediaId)

  if (!item) {
    throw new ApiError(404, "NOT_FOUND", "Archivo no encontrado")
  }

  await bucket.delete(item.r2Key)
  await deleteMediaById(db, item.id)

  if (origin) {
    await purgeMediaCache(origin, [item.r2Key])
  }
}

export async function deleteMediaObjects(
  bucket: R2Bucket,
  keys: string[],
  origin?: string,
): Promise<void> {
  for (let index = 0; index < keys.length; index += 1000) {
    await bucket.delete(keys.slice(index, index + 1000))
  }

  if (origin) {
    await purgeMediaCache(origin, keys)
  }
}

/**
 * Invalida las entradas de la Cache API de los medios borrados de R2. La URL
 * pública se deriva de la clave (`blogs/<blogId>/<filename>` → `/media/<blogId>/<filename>`).
 */
async function purgeMediaCache(origin: string, keys: string[]): Promise<void> {
  await Promise.all(
    keys.map((key) => {
      const path = key.startsWith("blogs/") ? key.slice("blogs/".length) : key

      return caches.default.delete(new URL(`/media/${path}`, origin).toString())
    }),
  )
}

/**
 * Devuelve las filas de `media` referenciadas en el HTML del artículo o en su
 * portada, sin validar a qué artículo pertenecen.
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
 * Devuelve las filas de `media` referenciadas en el HTML o la portada. Si
 * alguna pertenece a otro artículo, rechaza el guardado para no compartir
 * objetos.
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
 * ya no aparecen en el HTML (`keep`).
 */
export async function syncArticleMedia(
  bucket: R2Bucket,
  db: Database,
  blogId: string,
  articleId: string,
  media: { assign: Media[]; keep: Media[] },
  origin?: string,
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
    origin,
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
