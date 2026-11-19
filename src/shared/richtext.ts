import { Highlight } from "@tiptap/extension-highlight"
import { Image } from "@tiptap/extension-image"
import { TextAlign } from "@tiptap/extension-text-align"
import { TextStyleKit } from "@tiptap/extension-text-style"
import { StarterKit } from "@tiptap/starter-kit"

/** Extensiones compartidas por el editor y el renderizador de HTML. */
export const articleExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: { openOnClick: false, autolink: true },
  }),
  TextStyleKit,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Highlight.configure({ multicolor: true }),
  Image,
]

export const EMPTY_RICH_TEXT_JSON = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph" }],
})
