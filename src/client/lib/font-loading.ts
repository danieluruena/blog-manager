import { findFont } from "./editor-options"

type RichTextNode = {
  type?: unknown
  attrs?: Record<string, unknown>
  content?: unknown
  marks?: unknown
}

/**
 * Inyecta la hoja de Google Fonts de una familia concreta. Se llama al
 * seleccionar una fuente o al previsualizarla, no al cargar el editor.
 */
export function loadGoogleFont(nameOrFamily: string): void {
  if (typeof document === "undefined") {
    return
  }

  const font = findFont(nameOrFamily)

  if (!font || font.category === "system") {
    return
  }

  const id = font.name.replace(/\s+/g, "-").toLowerCase()

  if (document.querySelector(`link[data-google-font="${id}"]`)) {
    return
  }

  const family = font.name.replace(/\s+/g, "+")
  const weights = font.weights ?? [400, 700]
  const link = document.createElement("link")

  link.rel = "stylesheet"
  link.href = `https://fonts.googleapis.com/css2?family=${family}:wght@${weights.join(";")}&display=swap`
  link.dataset.googleFont = id
  document.head.append(link)
}

/** Carga las fuentes referenciadas en un documento Tiptap. */
export function loadFontsFromRichText(bodyJson: string): void {
  let document_: unknown

  try {
    document_ = JSON.parse(bodyJson)
  } catch {
    return
  }

  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") {
      return
    }

    const current = node as RichTextNode

    if (Array.isArray(current.marks)) {
      for (const mark of current.marks) {
        if (!mark || typeof mark !== "object") {
          continue
        }

        const typed = mark as { type?: unknown; attrs?: Record<string, unknown> }

        if (typed.type === "textStyle" && typeof typed.attrs?.fontFamily === "string") {
          loadGoogleFont(typed.attrs.fontFamily)
        }
      }
    }

    if (Array.isArray(current.content)) {
      for (const child of current.content) {
        visit(child)
      }
    }
  }

  visit(document_)
}
