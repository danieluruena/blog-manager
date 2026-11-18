import { describe, expect, it } from "vitest"

import { extractBlobImageUrls, replaceBlobImageUrls } from "../../src/client/lib/pending-images"

const firstBlob = "blob:http://localhost:5173/6f1a2b3c-1111-4111-8111-111111111111"
const secondBlob = "blob:http://localhost:5173/6f1a2b3c-2222-4222-8222-222222222222"

describe("pending images", () => {
  it("extrae las URLs blob usadas como imagen sin duplicados", () => {
    const markdown = [
      `![Primera](${firstBlob})`,
      "",
      `![Segunda](${secondBlob})`,
      "",
      `![Primera otra vez](${firstBlob})`,
      "",
      "![Remota](https://cdn.example.com/foto.png)",
    ].join("\n")

    expect(extractBlobImageUrls(markdown)).toEqual([firstBlob, secondBlob])
  })

  it("ignora imágenes que no son blob y texto que se parece", () => {
    const markdown = [
      "Texto con blob:http://localhost/algo suelto",
      "![R2](/media/blog/imagen.png)",
      "![Externa](https://example.com/imagen.png)",
    ].join("\n")

    expect(extractBlobImageUrls(markdown)).toEqual([])
  })

  it("sustituye todas las apariciones por la URL pública", () => {
    const markdown = `![A](${firstBlob}) y otra vez ![A](${firstBlob}) y ![B](${secondBlob})`
    const result = replaceBlobImageUrls(
      markdown,
      new Map([
        [firstBlob, "https://worker.dev/media/blog/a.png"],
        [secondBlob, "https://worker.dev/media/blog/b.png"],
      ]),
    )

    expect(result).not.toContain("blob:")
    expect(result).toContain("![A](https://worker.dev/media/blog/a.png)")
    expect(result).toContain("![B](https://worker.dev/media/blog/b.png)")
    expect(result.match(/media\/blog\/a\.png/g)).toHaveLength(2)
  })
})
