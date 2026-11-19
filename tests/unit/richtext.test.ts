import { describe, expect, it } from "vitest"

import { ApiError } from "../../src/server/lib/errors"
import { renderArticleHtml } from "../../src/server/lib/richtext"

function documentJson(content: unknown[]): string {
  return JSON.stringify({ type: "doc", content })
}

describe("rich text rendering", () => {
  it("convierte el documento Tiptap a HTML conservando fuentes y colores", () => {
    const html = renderArticleHtml(
      documentJson([
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Hola",
              marks: [
                {
                  type: "textStyle",
                  attrs: {
                    color: "#ff0000",
                    fontFamily: "Lora, serif",
                    fontSize: "24px",
                  },
                },
                { type: "bold" },
              ],
            },
          ],
        },
      ]),
    )

    expect(html).toContain("<p>")
    expect(html).toContain("Hola")
    expect(html).toContain("<strong>")
    expect(html).toMatch(/color:\s*#ff0000/i)
    expect(html).toContain("Lora, serif")
    expect(html).toContain("24px")
  })

  it("escapa el contenido de texto", () => {
    const html = renderArticleHtml(
      documentJson([
        {
          type: "paragraph",
          content: [{ type: "text", text: "<script>alert('xss')</script>" }],
        },
      ]),
    )

    expect(html).toContain("&lt;script&gt;")
    expect(html).not.toContain("<script>")
  })

  it("convierte un nodo de vídeo a HTML seguro", () => {
    const html = renderArticleHtml(
      documentJson([
        {
          type: "video",
          attrs: {
            src: "https://media.example.com/clip.webm",
            title: "Demostración",
          },
        },
      ]),
    )

    expect(html).toContain("<video")
    expect(html).toContain('src="https://media.example.com/clip.webm"')
    expect(html).toContain("controls")
    expect(html).toContain("playsinline")
    expect(html).toContain('title="Demostración"')
    expect(html).toContain("max-width: 100%")
  })

  it("rechaza vídeos con URLs no permitidas", () => {
    expect(() =>
      renderArticleHtml(
        documentJson([{ type: "video", attrs: { src: "blob:http://localhost:5173/clip" } }]),
      ),
    ).toThrow(ApiError)
  })

  it("rechaza documentos inválidos", () => {
    expect(() => renderArticleHtml("no es json")).toThrow(ApiError)
    expect(() => renderArticleHtml(JSON.stringify({ type: "paragraph" }))).toThrow(ApiError)

    try {
      renderArticleHtml(JSON.stringify({ type: "doc", content: [{ type: "script" }] }))
      throw new Error("Debería haber fallado")
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
    }
  })
})
