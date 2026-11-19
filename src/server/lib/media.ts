import { maxImageBytes, maxVideoBytes, type ImageMimeType } from "../../shared/constants"

export const MAX_IMAGE_BYTES = maxImageBytes
export const MAX_VIDEO_BYTES = maxVideoBytes

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const mediaFilenamePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(avif|gif|jpe?g|png|webm|webp)$/i

export function isUuid(value: string): boolean {
  return uuidPattern.test(value)
}

export function isMediaFilename(value: string): boolean {
  return mediaFilenamePattern.test(value)
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length))
}

export function isWebm(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  )
}

export function detectImageMime(bytes: Uint8Array): ImageMimeType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg"
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png"
  }

  if (bytes.length >= 6) {
    const header = ascii(bytes, 0, 6)

    if (header === "GIF87a" || header === "GIF89a") {
      return "image/gif"
    }
  }

  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "image/webp"
  }

  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp") {
    const brands = ascii(bytes, 8, Math.min(24, bytes.length - 8))

    if (brands.includes("avif") || brands.includes("avis")) {
      return "image/avif"
    }
  }

  return null
}

export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop()?.trim() ?? ""

  return base.slice(0, 200) || "imagen"
}

/** R2 key for a media object. `filename` must come from `isMediaFilename`. */
export function mediaKey(blogId: string, filename: string): string {
  return `blogs/${blogId}/${filename}`
}

export function mediaUrl(blogId: string, filename: string): string {
  return `/media/${blogId}/${filename}`
}

const mediaPathPattern =
  /\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:avif|gif|jpe?g|png|webm|webp))/gi

/** Nombres de fichero de imágenes y vídeos del blog referenciados en el HTML. */
export function extractMediaFilenames(html: string, blogId: string): string[] {
  const filenames = new Set<string>()
  const normalizedBlogId = blogId.toLowerCase()

  for (const match of html.matchAll(mediaPathPattern)) {
    const matchBlogId = match[1]
    const filename = match[2]

    if (matchBlogId?.toLowerCase() === normalizedBlogId && filename) {
      filenames.add(filename)
    }
  }

  return [...filenames]
}
