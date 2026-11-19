const MAX_SLUG_LENGTH = 80
const FALLBACK_SLUG = "sin-titulo"

export function toSlug(value: string, maxLength = MAX_SLUG_LENGTH): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")

  if (!normalized) {
    return FALLBACK_SLUG
  }

  const limit = Math.max(1, maxLength)
  let slug = normalized.slice(0, limit).replace(/-+$/g, "")

  if (slug.length === limit) {
    const lastHyphen = slug.lastIndexOf("-")

    if (lastHyphen > 0) {
      slug = slug.slice(0, lastHyphen).replace(/-+$/g, "")
    }
  }

  return slug || FALLBACK_SLUG
}

export function slugCandidate(base: string, attempt: number): string {
  return attempt === 0 ? base : `${base}-${attempt + 1}`
}

export async function findAvailableSlug(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>,
  maxAttempts = 50,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = slugCandidate(base, attempt)

    if (!(await isTaken(candidate))) {
      return candidate
    }
  }

  throw new Error("No se pudo generar un slug único")
}
