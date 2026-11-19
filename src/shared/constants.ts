export const userRoleValues = ["admin", "editor"] as const
export type UserRole = (typeof userRoleValues)[number]

export const articleStatusValues = ["draft", "published", "hidden", "featured"] as const
export type ArticleStatus = (typeof articleStatusValues)[number]

export const maxImageBytes = 5 * 1024 * 1024
export const maxSourceImageBytes = 20 * 1024 * 1024
export const maxImageDimension = 2560
export const webpQuality = 0.75

export const imageMimeTypeValues = [
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const
export type ImageMimeType = (typeof imageMimeTypeValues)[number]

/** Formatos que el navegador puede convertir a WebP antes de subir. */
export const sourceImageMimeTypeValues = [
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const
export type SourceImageMimeType = (typeof sourceImageMimeTypeValues)[number]

/** Único formato aceptado por la API de subida. */
export const uploadImageMimeType = "image/webp"
