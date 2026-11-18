export const userRoleValues = ["admin", "editor"] as const
export type UserRole = (typeof userRoleValues)[number]

export const articleStatusValues = ["draft", "published", "hidden", "featured"] as const
export type ArticleStatus = (typeof articleStatusValues)[number]

export const maxImageBytes = 5 * 1024 * 1024

export const imageMimeTypeValues = [
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const
export type ImageMimeType = (typeof imageMimeTypeValues)[number]
