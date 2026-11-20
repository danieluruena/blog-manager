import { env } from "cloudflare:workers"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { MAX_IMAGE_BYTES } from "../../src/server/lib/media"
import {
  apiFetch,
  clearDatabase,
  createTestBlog,
  createTestUser,
  grantBlogPermission,
  jsonRequest,
  loginAs,
} from "./helpers"

const WEBP_BASE64 = "UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=="
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

function webpBytes(): Uint8Array {
  return Uint8Array.from(atob(WEBP_BASE64), (character) => character.charCodeAt(0))
}

function pngBytes(): Uint8Array {
  return Uint8Array.from(atob(PNG_BASE64), (character) => character.charCodeAt(0))
}

function imageFile(name = "pixel.webp", type = "image/webp"): File {
  return new File([webpBytes()], name, { type })
}

function uploadRequest(blogId: string, file: File, cookie: string | null): Request {
  const form = new FormData()
  form.set("file", file)

  const headers = new Headers()

  if (cookie) {
    headers.set("cookie", cookie)
  }

  return new Request(`http://example.com/api/admin/blogs/${blogId}/media`, {
    method: "POST",
    headers,
    body: form,
  })
}

async function clearMediaBucket(): Promise<void> {
  const objects = await env.MEDIA.list()

  if (objects.objects.length > 0) {
    await env.MEDIA.delete(objects.objects.map((object) => object.key))
  }
}

async function setup() {
  const admin = await createTestUser({ email: "admin@example.com", role: "admin" })
  const editor = await createTestUser({ email: "editor@example.com", role: "editor" })
  const adminCookie = (await loginAs(admin)).cookie
  const editorCookie = (await loginAs(editor)).cookie
  const blog = await createTestBlog()
  await grantBlogPermission(editor.id, blog.id, "write")

  return { blog, adminCookie, editorCookie }
}

beforeEach(async () => {
  await clearDatabase()
  await clearMediaBucket()
})

describe("media API", () => {
  it("exige autenticación para subir archivos", async () => {
    const blog = await createTestBlog()
    const response = await apiFetch(uploadRequest(blog.id, imageFile(), null))

    expect(response.status).toBe(401)
  })

  it("sube una imagen, la sirve con caché larga y responde 304 con ETag", async () => {
    const { blog, adminCookie } = await setup()
    const response = await apiFetch(uploadRequest(blog.id, imageFile(), adminCookie))

    expect(response.status).toBe(201)

    const body = (await response.json()) as {
      data: {
        id: string
        blogId: string
        filename: string
        mimeType: string
        sizeBytes: number
        url: string
      }
    }

    expect(body.data.blogId).toBe(blog.id)
    expect(body.data.filename).toMatch(/^[0-9a-f-]{36}\.webp$/)
    expect(body.data.mimeType).toBe("image/webp")
    expect(body.data.sizeBytes).toBe(webpBytes().length)
    expect(body.data.url).toBe(`http://example.com/media/${blog.id}/${body.data.filename}`)

    const image = await apiFetch(new Request(body.data.url))

    expect(image.status).toBe(200)
    expect(image.headers.get("content-type")).toBe("image/webp")
    expect(image.headers.get("cache-control")).toBe("public, max-age=31536000, immutable")
    expect(image.headers.get("x-content-type-options")).toBe("nosniff")
    expect(image.headers.get("content-length")).toBe(String(webpBytes().length))

    const etag = image.headers.get("etag")
    expect(etag).toBeTruthy()

    const bytes = new Uint8Array(await image.arrayBuffer())
    expect(Array.from(bytes)).toEqual(Array.from(webpBytes()))

    const cached = await apiFetch(
      new Request(body.data.url, { headers: { "if-none-match": etag ?? "" } }),
    )

    expect(cached.status).toBe(304)
  })

  it("rechaza imágenes que no sean WebP, contenido falsificado o vacío", async () => {
    const { blog, adminCookie } = await setup()

    const textFile = new File(["hola"], "nota.txt", { type: "text/plain" })
    const textResponse = await apiFetch(uploadRequest(blog.id, textFile, adminCookie))
    expect(textResponse.status).toBe(415)

    const pngFile = new File([pngBytes()], "pixel.png", { type: "image/png" })
    const pngResponse = await apiFetch(uploadRequest(blog.id, pngFile, adminCookie))
    expect(pngResponse.status).toBe(415)

    const spoofed = new File([pngBytes()], "falso.webp", { type: "image/webp" })
    const spoofedResponse = await apiFetch(uploadRequest(blog.id, spoofed, adminCookie))
    expect(spoofedResponse.status).toBe(415)

    const garbage = new File([new Uint8Array([1, 2, 3, 4])], "fake.webp", {
      type: "image/webp",
    })
    const garbageResponse = await apiFetch(uploadRequest(blog.id, garbage, adminCookie))
    expect(garbageResponse.status).toBe(415)

    const empty = new File([], "empty.webp", { type: "image/webp" })
    const emptyResponse = await apiFetch(uploadRequest(blog.id, empty, adminCookie))
    expect(emptyResponse.status).toBe(400)

    const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg"></svg>'], "icon.svg", {
      type: "image/svg+xml",
    })
    const svgResponse = await apiFetch(uploadRequest(blog.id, svg, adminCookie))
    expect(svgResponse.status).toBe(415)
  })

  it("rechaza imágenes de más de 5 MB", async () => {
    const { blog, adminCookie } = await setup()
    const bigFile = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "grande.webp", {
      type: "image/webp",
    })

    const response = await apiFetch(uploadRequest(blog.id, bigFile, adminCookie))

    expect(response.status).toBe(413)
  })

  it("permite subir a editores y reserva el borrado a administradores", async () => {
    const { blog, adminCookie, editorCookie } = await setup()
    const create = await apiFetch(uploadRequest(blog.id, imageFile(), editorCookie))

    expect(create.status).toBe(201)

    const body = (await create.json()) as { data: { id: string; url: string } }

    const forbidden = await apiFetch(
      jsonRequest(`/api/admin/blogs/${blog.id}/media/${body.data.id}`, {
        method: "DELETE",
        cookie: editorCookie,
      }),
    )

    expect(forbidden.status).toBe(403)

    const deleted = await apiFetch(
      jsonRequest(`/api/admin/blogs/${blog.id}/media/${body.data.id}`, {
        method: "DELETE",
        cookie: adminCookie,
      }),
    )

    expect(deleted.status).toBe(204)

    const image = await apiFetch(new Request(body.data.url))
    expect(image.status).toBe(404)
  })

  it("devuelve 404 para claves inexistentes o nombres inválidos", async () => {
    const { blog } = await setup()
    const cases = [
      `/media/${blog.id}/00000000-0000-4000-8000-000000000000.webp`,
      `/media/no-es-un-uuid/00000000-0000-4000-8000-000000000000.webp`,
      `/media/${blog.id}/archivo.txt`,
      `/media/${blog.id}/..%2F..%2Fsecreto.png`,
    ]

    for (const path of cases) {
      const response = await apiFetch(new Request(`http://example.com${path}`))
      expect(response.status).toBe(404)
    }
  })

  it("elimina los objetos de R2 al borrar un blog sin artículos", async () => {
    const { blog, adminCookie } = await setup()
    const create = await apiFetch(uploadRequest(blog.id, imageFile(), adminCookie))
    const body = (await create.json()) as { data: { url: string } }

    const keysBefore = await env.MEDIA.list({ prefix: `blogs/${blog.id}/` })
    expect(keysBefore.objects).toHaveLength(1)

    const deleted = await apiFetch(
      jsonRequest(`/api/admin/blogs/${blog.id}`, {
        method: "DELETE",
        cookie: adminCookie,
      }),
    )

    expect(deleted.status).toBe(204)

    await vi.waitFor(async () => {
      const keysAfter = await env.MEDIA.list({ prefix: `blogs/${blog.id}/` })
      expect(keysAfter.objects).toHaveLength(0)
    })

    const image = await apiFetch(new Request(body.data.url))
    expect(image.status).toBe(404)
  })
})
