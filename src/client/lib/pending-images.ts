type RichTextNode = {
  type?: unknown
  attrs?: Record<string, unknown>
  content?: unknown
}

type MediaNodeType = "image" | "video"

function parseDocument(bodyJson: string): RichTextNode | null {
  try {
    const parsed = JSON.parse(bodyJson) as unknown

    if (!parsed || typeof parsed !== "object" || (parsed as RichTextNode).type !== "doc") {
      return null
    }

    return parsed as RichTextNode
  } catch {
    return null
  }
}

function walk(node: unknown, visit: (node: RichTextNode) => void): void {
  if (!node || typeof node !== "object") {
    return
  }

  const current = node as RichTextNode
  visit(current)

  if (Array.isArray(current.content)) {
    for (const child of current.content) {
      walk(child, visit)
    }
  }
}

function extractBlobUrls(bodyJson: string, types: MediaNodeType[]): string[] {
  const document = parseDocument(bodyJson)

  if (!document) {
    return []
  }

  const allowed = new Set<string>(types)
  const urls = new Set<string>()

  walk(document, (node) => {
    if (typeof node.type !== "string" || !allowed.has(node.type)) {
      return
    }

    if (typeof node.attrs?.src === "string" && node.attrs.src.startsWith("blob:")) {
      urls.add(node.attrs.src)
    }
  })

  return [...urls]
}

function replaceBlobUrls(
  bodyJson: string,
  types: MediaNodeType[],
  replacements: Map<string, string>,
): string {
  const document = parseDocument(bodyJson)

  if (!document || replacements.size === 0) {
    return bodyJson
  }

  const allowed = new Set<string>(types)

  walk(document, (node) => {
    if (typeof node.type !== "string" || !allowed.has(node.type)) {
      return
    }

    if (typeof node.attrs?.src !== "string") {
      return
    }

    const replacement = replacements.get(node.attrs.src)

    if (replacement) {
      node.attrs.src = replacement
    }
  })

  return JSON.stringify(document)
}

/** Devuelve las URLs `blob:` usadas en imágenes del documento Tiptap. */
export function extractBlobImageUrls(bodyJson: string): string[] {
  return extractBlobUrls(bodyJson, ["image"])
}

/** Devuelve las URLs `blob:` usadas en vídeos del documento Tiptap. */
export function extractBlobVideoUrls(bodyJson: string): string[] {
  return extractBlobUrls(bodyJson, ["video"])
}

/** Devuelve las URLs `blob:` usadas en imágenes y vídeos del documento. */
export function extractBlobMediaUrls(bodyJson: string): string[] {
  return extractBlobUrls(bodyJson, ["image", "video"])
}

/** Sustituye las URLs `blob:` por las públicas en imágenes del documento. */
export function replaceBlobImageUrls(bodyJson: string, replacements: Map<string, string>): string {
  return replaceBlobUrls(bodyJson, ["image"], replacements)
}

/** Sustituye las URLs `blob:` por las públicas en vídeos del documento. */
export function replaceBlobVideoUrls(bodyJson: string, replacements: Map<string, string>): string {
  return replaceBlobUrls(bodyJson, ["video"], replacements)
}

/** Sustituye las URLs `blob:` por las públicas en imágenes y vídeos. */
export function replaceBlobMediaUrls(bodyJson: string, replacements: Map<string, string>): string {
  return replaceBlobUrls(bodyJson, ["image", "video"], replacements)
}
