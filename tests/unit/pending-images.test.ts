import { describe, expect, it } from "vitest"

import {
  extractBlobImageUrls,
  extractBlobMediaUrls,
  extractBlobVideoUrls,
  replaceBlobImageUrls,
  replaceBlobMediaUrls,
  replaceBlobVideoUrls,
} from "../../src/client/lib/pending-images"

const firstBlob = "blob:http://localhost:5173/6f1a2b3c-1111-4111-8111-111111111111"
const secondBlob = "blob:http://localhost:5173/6f1a2b3c-2222-4222-8222-222222222222"

function documentJson(images: Array<{ src: string; alt?: string }>, text = "Hola"): string {
  return JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
      ...images.map((image) => ({
        type: "image",
        attrs: { src: image.src, alt: image.alt ?? "" },
      })),
    ],
  })
}

function mixedDocumentJson(): string {
  return JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Hola" }],
      },
      { type: "image", attrs: { src: firstBlob, alt: "Imagen" } },
      { type: "video", attrs: { src: secondBlob, title: "Vídeo" } },
    ],
  })
}

describe("pending images", () => {
  it("extrae las URLs blob usadas como imagen sin duplicados", () => {
    const bodyJson = documentJson([
      { src: firstBlob },
      { src: secondBlob },
      { src: firstBlob },
      { src: "https://cdn.example.com/foto.webp" },
    ])

    expect(extractBlobImageUrls(bodyJson)).toEqual([firstBlob, secondBlob])
  })

  it("ignora documentos inválidos o sin imágenes blob", () => {
    expect(extractBlobImageUrls("no es json")).toEqual([])
    expect(
      extractBlobImageUrls(
        documentJson([{ src: "/media/blog/imagen.webp" }, { src: "https://x.test/a.webp" }]),
      ),
    ).toEqual([])
  })

  it("sustituye las URLs en los nodos de imagen", () => {
    const bodyJson = documentJson([{ src: firstBlob }, { src: secondBlob }])
    const result = replaceBlobImageUrls(
      bodyJson,
      new Map([
        [firstBlob, "https://worker.dev/media/blog/a.webp"],
        [secondBlob, "https://worker.dev/media/blog/b.webp"],
      ]),
    )

    expect(result).not.toContain("blob:")
    expect(result).toContain("https://worker.dev/media/blog/a.webp")
    expect(result).toContain("https://worker.dev/media/blog/b.webp")
  })

  it("extrae las URLs blob de los vídeos", () => {
    expect(extractBlobVideoUrls(mixedDocumentJson())).toEqual([secondBlob])
  })

  it("extrae imágenes y vídeos sin duplicados", () => {
    expect(extractBlobMediaUrls(mixedDocumentJson())).toEqual([firstBlob, secondBlob])
  })

  it("sustituye solo las URLs de los vídeos", () => {
    const result = replaceBlobVideoUrls(
      mixedDocumentJson(),
      new Map([[secondBlob, "https://worker.dev/media/blog/clip.webm"]]),
    )

    expect(result).toContain(firstBlob)
    expect(result).toContain("https://worker.dev/media/blog/clip.webm")
    expect(result).not.toContain(secondBlob)
  })

  it("sustituye imágenes y vídeos en una sola pasada", () => {
    const result = replaceBlobMediaUrls(
      mixedDocumentJson(),
      new Map([
        [firstBlob, "https://worker.dev/media/blog/a.webp"],
        [secondBlob, "https://worker.dev/media/blog/clip.webm"],
      ]),
    )

    expect(result).not.toContain("blob:")
    expect(result).toContain("https://worker.dev/media/blog/a.webp")
    expect(result).toContain("https://worker.dev/media/blog/clip.webm")
  })
})
