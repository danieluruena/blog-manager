const blobImagePattern = /!\[[^\]]*\]\((blob:[^)\s]+)\)/g

/** Devuelve las URLs `blob:` usadas como imagen en el markdown, sin duplicados. */
export function extractBlobImageUrls(markdown: string): string[] {
  const urls = new Set<string>()

  for (const match of markdown.matchAll(blobImagePattern)) {
    const url = match[1]

    if (url) {
      urls.add(url)
    }
  }

  return [...urls]
}

/** Sustituye las URLs `blob:` por sus URLs públicas en todo el markdown. */
export function replaceBlobImageUrls(markdown: string, replacements: Map<string, string>): string {
  let result = markdown

  for (const [blobUrl, publicUrl] of replacements) {
    result = result.split(blobUrl).join(publicUrl)
  }

  return result
}
