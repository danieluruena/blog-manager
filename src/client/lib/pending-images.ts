type RichTextNode = {
  type?: unknown
  attrs?: Record<string, unknown>
  content?: unknown
}

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

/** Devuelve las URLs `blob:` usadas en imágenes del documento Tiptap. */
export function extractBlobImageUrls(bodyJson: string): string[] {
  const document = parseDocument(bodyJson)

  if (!document) {
    return []
  }

  const urls = new Set<string>()

  walk(document, (node) => {
    if (node.type === "image" && typeof node.attrs?.src === "string") {
      const src = node.attrs.src

      if (src.startsWith("blob:")) {
        urls.add(src)
      }
    }
  })

  return [...urls]
}

/** Sustituye las URLs `blob:` por las URLs públicas en el documento Tiptap. */
export function replaceBlobImageUrls(bodyJson: string, replacements: Map<string, string>): string {
  const document = parseDocument(bodyJson)

  if (!document || replacements.size === 0) {
    return bodyJson
  }

  walk(document, (node) => {
    if (node.type !== "image" || typeof node.attrs?.src !== "string") {
      return
    }

    const replacement = replacements.get(node.attrs.src)

    if (replacement) {
      node.attrs.src = replacement
    }
  })

  return JSON.stringify(document)
}
