import { ApiError } from "./apiError"

type RichTextMark = {
  type?: unknown
  attrs?: Record<string, unknown>
}

type RichTextNode = {
  type?: unknown
  text?: unknown
  attrs?: Record<string, unknown>
  content?: unknown
  marks?: unknown
}

const ALLOWED_ALIGNMENTS = new Set(["left", "center", "right", "justify"])
const ALLOWED_HEADINGS = new Set([1, 2, 3])
const MAX_DEPTH = 50

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;")
}

function safeColor(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const color = value.trim()

  if (
    /^#[0-9a-f]{3,8}$/i.test(color) ||
    /^rgba?\([^)]*\)$/i.test(color) ||
    /^hsla?\([^)]*\)$/i.test(color)
  ) {
    return color
  }

  return null
}

function safeFontFamily(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const family = value.trim()

  return /^[a-zA-Z0-9\s,'"-]+$/.test(family) ? family : null
}

function safeFontSize(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const size = value.trim()

  return /^\d+(\.\d+)?(px|rem|em)$/.test(size) ? size : null
}

function safeHref(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const href = value.trim()

  if (/^(https?:|mailto:|tel:)/i.test(href) || href.startsWith("/") || href.startsWith("#")) {
    return href
  }

  return null
}

function safeMediaSrc(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const src = value.trim()

  if (/^https?:\/\//i.test(src) || src.startsWith("/")) {
    return src
  }

  return null
}

function alignmentAttribute(attrs?: Record<string, unknown>): string {
  const alignment = attrs?.textAlign

  return typeof alignment === "string" && ALLOWED_ALIGNMENTS.has(alignment)
    ? ` style="text-align: ${alignment}"`
    : ""
}

function renderMarks(text: string, marks: unknown): string {
  if (!Array.isArray(marks)) {
    return text
  }

  const typedMarks = marks.filter(
    (mark): mark is RichTextMark => Boolean(mark) && typeof mark === "object",
  )
  const types = new Set(typedMarks.map((mark) => mark.type))
  let html = text

  if (types.has("code")) {
    html = `<code>${html}</code>`
  }

  const highlight = typedMarks.find((mark) => mark.type === "highlight")
  const highlightColor = safeColor(highlight?.attrs?.color)

  if (highlightColor) {
    html = `<mark style="background-color: ${highlightColor}">${html}</mark>`
  }

  const textStyle = typedMarks.find((mark) => mark.type === "textStyle")
  const styles: string[] = []

  if (textStyle) {
    const color = safeColor(textStyle.attrs?.color)
    const fontFamily = safeFontFamily(textStyle.attrs?.fontFamily)
    const fontSize = safeFontSize(textStyle.attrs?.fontSize)
    const backgroundColor = safeColor(textStyle.attrs?.backgroundColor)

    if (color) styles.push(`color: ${color}`)
    if (fontFamily) styles.push(`font-family: ${fontFamily}`)
    if (fontSize) styles.push(`font-size: ${fontSize}`)
    if (backgroundColor) styles.push(`background-color: ${backgroundColor}`)
  }

  if (styles.length > 0) {
    html = `<span style="${styles.join("; ")}">${html}</span>`
  }

  if (types.has("bold")) {
    html = `<strong>${html}</strong>`
  }
  if (types.has("italic")) {
    html = `<em>${html}</em>`
  }
  if (types.has("underline")) {
    html = `<u>${html}</u>`
  }
  if (types.has("strike")) {
    html = `<s>${html}</s>`
  }

  const link = typedMarks.find((mark) => mark.type === "link")
  const href = safeHref(link?.attrs?.href)

  if (href) {
    html = `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer">${html}</a>`
  }

  return html
}

function codeBlockText(node: RichTextNode): string {
  if (typeof node.text === "string") {
    return escapeHtml(node.text)
  }

  if (Array.isArray(node.content)) {
    return node.content
      .map((child) => {
        if (!child || typeof child !== "object") {
          return ""
        }

        const childNode = child as RichTextNode

        if (childNode.type === "hardBreak") {
          return "<br>"
        }

        return codeBlockText(childNode)
      })
      .join("")
  }

  return ""
}

function renderNode(node: unknown, depth: number): string {
  if (depth > MAX_DEPTH || !node || typeof node !== "object") {
    throw new ApiError(400, "INVALID_CONTENT", "El contenido del artículo no es válido")
  }

  const current = node as RichTextNode
  const content = Array.isArray(current.content) ? current.content : []

  switch (current.type) {
    case "doc":
      return content.map((child) => renderNode(child, depth + 1)).join("")
    case "paragraph":
      return `<p${alignmentAttribute(current.attrs)}>${content
        .map((child) => renderNode(child, depth + 1))
        .join("")}</p>`
    case "heading": {
      const level = Number(current.attrs?.level)

      if (!ALLOWED_HEADINGS.has(level)) {
        throw new ApiError(400, "INVALID_CONTENT", "El contenido del artículo no es válido")
      }

      return `<h${level}${alignmentAttribute(current.attrs)}>${content
        .map((child) => renderNode(child, depth + 1))
        .join("")}</h${level}>`
    }
    case "text":
      if (typeof current.text !== "string") {
        throw new ApiError(400, "INVALID_CONTENT", "El contenido del artículo no es válido")
      }

      return renderMarks(escapeHtml(current.text), current.marks)
    case "hardBreak":
      return "<br>"
    case "bulletList":
      return `<ul>${content.map((child) => renderNode(child, depth + 1)).join("")}</ul>`
    case "orderedList": {
      const start = Number(current.attrs?.start)
      const startAttribute = Number.isInteger(start) && start > 1 ? ` start="${start}"` : ""

      return `<ol${startAttribute}>${content
        .map((child) => renderNode(child, depth + 1))
        .join("")}</ol>`
    }
    case "listItem":
      return `<li>${content.map((child) => renderNode(child, depth + 1)).join("")}</li>`
    case "blockquote":
      return `<blockquote>${content.map((child) => renderNode(child, depth + 1)).join("")}</blockquote>`
    case "codeBlock": {
      const language = current.attrs?.language
      const languageClass =
        typeof language === "string" && /^[a-z0-9-]+$/i.test(language)
          ? ` class="language-${language}"`
          : ""

      return `<pre><code${languageClass}>${codeBlockText(current)}</code></pre>`
    }
    case "horizontalRule":
      return "<hr>"
    case "image": {
      const src = safeMediaSrc(current.attrs?.src)

      if (!src) {
        throw new ApiError(400, "INVALID_CONTENT", "El contenido del artículo no es válido")
      }

      const alt = typeof current.attrs?.alt === "string" ? current.attrs.alt : ""
      const title =
        typeof current.attrs?.title === "string" && current.attrs.title.length > 0
          ? ` title="${escapeAttribute(current.attrs.title)}"`
          : ""

      return `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}"${title}>`
    }
    case "video": {
      const src = safeMediaSrc(current.attrs?.src)

      if (!src) {
        throw new ApiError(400, "INVALID_CONTENT", "El contenido del artículo no es válido")
      }

      const title =
        typeof current.attrs?.title === "string" && current.attrs.title.length > 0
          ? ` title="${escapeAttribute(current.attrs.title)}"`
          : ""

      return `<video controls playsinline preload="metadata" style="max-width: 100%; height: auto" src="${escapeAttribute(src)}"${title}></video>`
    }
    default:
      throw new ApiError(400, "INVALID_CONTENT", "El contenido del artículo no es válido")
  }
}

/**
 * Convierte el documento Tiptap a HTML usando una lista blanca de nodos y
 * marcas. No usa DOM, así que funciona igual en Workers, Node y tests.
 */
export function renderArticleHtml(bodyJson: string): string {
  let document: unknown

  try {
    document = JSON.parse(bodyJson)
  } catch {
    throw new ApiError(400, "INVALID_CONTENT", "El contenido del artículo no es válido")
  }

  if (
    !document ||
    typeof document !== "object" ||
    (document as { type?: unknown }).type !== "doc"
  ) {
    throw new ApiError(400, "INVALID_CONTENT", "El contenido del artículo no es válido")
  }

  return renderNode(document, 0)
}
