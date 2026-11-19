import { describe, expect, it } from "vitest"

import {
  articleFormSchema,
  isVisibleStatus,
  toFormValues,
  toInput,
} from "../../src/client/lib/article-form"
import { EMPTY_RICH_TEXT_JSON } from "../../src/shared/richtext"
import type { ArticleDto } from "../../src/shared/types"

const article: ArticleDto = {
  id: "a0000001-0000-4000-8000-000000000001",
  blogId: "b0000001-0000-4000-8000-000000000001",
  title: "Artículo de prueba",
  slug: "articulo-de-prueba",
  excerpt: "Un resumen",
  author: "Daniel",
  status: "published",
  body: "<h1>Hola</h1>",
  bodyJson: JSON.stringify({
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "Hola" }],
      },
    ],
  }),
  createdAt: "2026-11-18T09:00:00.000Z",
  publishedAt: "2026-11-18T10:00:00.000Z",
  updatedAt: "2026-11-18T11:00:00.000Z",
}

describe("article form", () => {
  it("parte de los valores del artículo y del autor por defecto", () => {
    expect(toFormValues(undefined, "Admin")).toMatchObject({
      title: "",
      slug: "",
      excerpt: "",
      author: "Admin",
      status: "draft",
      publishedAt: "",
      bodyJson: EMPTY_RICH_TEXT_JSON,
    })

    const values = toFormValues(article, "Admin")

    expect(values.title).toBe(article.title)
    expect(values.author).toBe(article.author)
    expect(values.status).toBe("published")
    expect(values.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })

  it("omite el slug vacío para que el servidor lo genere", () => {
    const values = toFormValues(undefined, "Admin")
    const input = toInput({ ...values, title: "Nuevo artículo" }, "draft")

    expect(input).not.toHaveProperty("slug")
    expect(input.publishedAt).toBeNull()
    expect(input.status).toBe("draft")
  })

  it("incluye el slug y la fecha cuando están presentes", () => {
    const values = {
      ...toFormValues(article, "Admin"),
      slug: "nuevo-slug",
    }
    const input = toInput(values, "featured")

    expect(input.slug).toBe("nuevo-slug")
    expect(input.status).toBe("featured")
    expect(input.publishedAt).toBe("2026-11-18T10:00:00.000Z")
  })

  it("valida título, autor, slug y extracto", () => {
    const valid = articleFormSchema.safeParse({
      ...toFormValues(article, "Admin"),
      slug: "",
      publishedAt: "",
    })

    expect(valid.success).toBe(true)

    const invalidSlug = articleFormSchema.safeParse({
      ...toFormValues(article, "Admin"),
      slug: "Slug Inválido",
    })

    expect(invalidSlug.success).toBe(false)

    const missingTitle = articleFormSchema.safeParse({
      ...toFormValues(article, "Admin"),
      title: "  ",
      author: "",
    })

    expect(missingTitle.success).toBe(false)
  })

  it("considera visibles los estados published y featured", () => {
    expect(isVisibleStatus("published")).toBe(true)
    expect(isVisibleStatus("featured")).toBe(true)
    expect(isVisibleStatus("draft")).toBe(false)
    expect(isVisibleStatus("hidden")).toBe(false)
  })
})
