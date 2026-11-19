import { describe, expect, it } from "vitest"

import { extractMediaFilenames } from "../../src/server/lib/media"

const blogId = "b0000001-0000-4000-8000-000000000001"
const otherBlogId = "b0000002-0000-4000-8000-000000000002"
const filename = "0f1e2d3c-1111-4111-8111-111111111111.png"

describe("media markdown helpers", () => {
  it("extrae nombres de fichero del blog desde URLs absolutas y relativas", () => {
    const markdown = [
      `![A](https://worker.dev/media/${blogId}/${filename})`,
      `![B](/media/${blogId}/${filename})`,
      `![Otra](https://otro.dev/media/${otherBlogId}/${filename})`,
      "![Externa](https://example.com/foto.png)",
    ].join("\n")

    expect(extractMediaFilenames(markdown, blogId)).toEqual([filename])
  })

  it("ignora ficheros con formato no permitido o nombres inválidos", () => {
    const markdown = [
      `/media/${blogId}/archivo.txt`,
      `/media/${blogId}/..%2Fsecreto.png`,
      `/media/${blogId}/0f1e2d3c-1111-4111-8111-111111111111.webp`,
    ].join("\n")

    expect(extractMediaFilenames(markdown, blogId)).toEqual([
      "0f1e2d3c-1111-4111-8111-111111111111.webp",
    ])
  })

  it("no repite una imagen referenciada varias veces", () => {
    const markdown = [
      `![A](/media/${blogId}/${filename})`,
      `![B](/media/${blogId}/${filename})`,
    ].join("\n")

    expect(extractMediaFilenames(markdown, blogId)).toEqual([filename])
  })
})
