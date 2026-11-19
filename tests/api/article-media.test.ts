import { env } from "cloudflare:workers"
import { beforeEach, describe, expect, it } from "vitest"

import {
  apiFetch,
  clearDatabase,
  createTestBlog,
  createTestUser,
  jsonRequest,
  loginAs,
  richTextImageJson,
  richTextJson,
} from "./helpers"

const WEBP_BASE64 = "UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=="

function webpBytes(): Uint8Array {
  return Uint8Array.from(atob(WEBP_BASE64), (character) => character.charCodeAt(0))
}

function imageFile(name = "pixel.webp"): File {
  return new File([webpBytes()], name, { type: "image/webp" })
}

function uploadRequest(blogId: string, cookie: string): Request {
  const form = new FormData()
  form.set("file", imageFile())

  return new Request(`http://example.com/api/admin/blogs/${blogId}/media`, {
    method: "POST",
    headers: { cookie },
    body: form,
  })
}

async function clearMediaBucket(): Promise<void> {
  const objects = await env.MEDIA.list()

  if (objects.objects.length > 0) {
    await env.MEDIA.delete(objects.objects.map((object) => object.key))
  }
}

async function mediaCount(blogId: string): Promise<number> {
  const row = await env.DB.prepare("SELECT count(*) AS total FROM media WHERE blog_id = ?")
    .bind(blogId)
    .first<{ total: number }>()

  return row?.total ?? 0
}

async function setup() {
  const admin = await createTestUser({ email: "admin@example.com", role: "admin" })
  const login = await loginAs(admin)
  const cookie = login.cookie

  if (!cookie) {
    throw new Error("No se pudo iniciar sesión")
  }

  const blog = await createTestBlog()

  return { blog, cookie }
}

type UploadedImage = { id: string; filename: string; url: string }

async function uploadImage(blogId: string, cookie: string): Promise<UploadedImage> {
  const response = await apiFetch(uploadRequest(blogId, cookie))

  expect(response.status).toBe(201)

  const body = (await response.json()) as { data: UploadedImage }

  return body.data
}

async function createArticle(
  blogId: string,
  cookie: string,
  bodyJson: string,
  coverImage: string | null = null,
): Promise<{ status: number; data: { id: string; coverImage: string | null } }> {
  const response = await apiFetch(
    jsonRequest(`/api/admin/blogs/${blogId}/articles`, {
      method: "POST",
      cookie,
      body: {
        title: "Artículo con imagen",
        author: "Admin",
        bodyJson,
        coverImage,
        status: "draft",
      },
    }),
  )

  return {
    status: response.status,
    data: ((await response.json()) as { data: { id: string; coverImage: string | null } }).data,
  }
}

function updateArticleRequest(
  blogId: string,
  articleId: string,
  cookie: string,
  input: { bodyJson?: string; coverImage?: string | null },
): Request {
  return jsonRequest(`/api/admin/blogs/${blogId}/articles/${articleId}`, {
    method: "PATCH",
    cookie,
    body: input,
  })
}

async function fetchArticle(
  blogId: string,
  articleId: string,
  cookie: string,
): Promise<{ coverImage: string | null }> {
  const response = await apiFetch(
    jsonRequest(`/api/admin/blogs/${blogId}/articles/${articleId}`, { cookie }),
  )

  return ((await response.json()) as { data: { coverImage: string | null } }).data
}

beforeEach(async () => {
  await clearDatabase()
  await clearMediaBucket()
})

describe("article media lifecycle", () => {
  it("elimina de R2 y D1 las imágenes que se quitan al guardar", async () => {
    const { blog, cookie } = await setup()
    const image = await uploadImage(blog.id, cookie)
    const created = await createArticle(blog.id, cookie, richTextImageJson(image.url))

    expect(created.status).toBe(201)
    expect((await apiFetch(new Request(image.url))).status).toBe(200)
    expect(await mediaCount(blog.id)).toBe(1)

    const updated = await apiFetch(
      updateArticleRequest(blog.id, created.data.id, cookie, {
        bodyJson: richTextJson("Sin imágenes"),
      }),
    )

    expect(updated.status).toBe(200)
    expect((await apiFetch(new Request(image.url))).status).toBe(404)
    expect(await mediaCount(blog.id)).toBe(0)
  })

  it("cada subida crea un objeto independiente y borrar una no afecta a la otra", async () => {
    const { blog, cookie } = await setup()
    const first = await uploadImage(blog.id, cookie)
    const second = await uploadImage(blog.id, cookie)

    expect(first.url).not.toBe(second.url)
    expect(first.filename).not.toBe(second.filename)

    const firstArticle = await createArticle(blog.id, cookie, richTextImageJson(first.url, "A"))
    const secondArticle = await createArticle(blog.id, cookie, richTextImageJson(second.url, "B"))

    expect(firstArticle.status).toBe(201)
    expect(secondArticle.status).toBe(201)
    expect(await mediaCount(blog.id)).toBe(2)

    const updated = await apiFetch(
      updateArticleRequest(blog.id, firstArticle.data.id, cookie, {
        bodyJson: richTextJson("Sin imágenes"),
      }),
    )

    expect(updated.status).toBe(200)
    expect((await apiFetch(new Request(first.url))).status).toBe(404)
    expect((await apiFetch(new Request(second.url))).status).toBe(200)
    expect(await mediaCount(blog.id)).toBe(1)
  })

  it("no permite reutilizar la imagen de otro artículo", async () => {
    const { blog, cookie } = await setup()
    const image = await uploadImage(blog.id, cookie)

    const first = await createArticle(blog.id, cookie, richTextImageJson(image.url, "A"))
    expect(first.status).toBe(201)

    const second = await createArticle(blog.id, cookie, richTextImageJson(image.url, "B"))

    expect(second.status).toBe(409)

    const list = await apiFetch(jsonRequest(`/api/admin/blogs/${blog.id}/articles`, { cookie }))
    const listBody = (await list.json()) as { meta: { total: number } }

    expect(listBody.meta.total).toBe(1)
    expect((await apiFetch(new Request(image.url))).status).toBe(200)
  })

  it("borra las imágenes al eliminar el artículo", async () => {
    const { blog, cookie } = await setup()
    const image = await uploadImage(blog.id, cookie)
    const created = await createArticle(blog.id, cookie, richTextImageJson(image.url))

    const deleted = await apiFetch(
      jsonRequest(`/api/admin/blogs/${blog.id}/articles/${created.data.id}`, {
        method: "DELETE",
        cookie,
      }),
    )

    expect(deleted.status).toBe(204)
    expect((await apiFetch(new Request(image.url))).status).toBe(404)
    expect(await mediaCount(blog.id)).toBe(0)
  })

  it("asigna la portada al guardar y la elimina al quitarla", async () => {
    const { blog, cookie } = await setup()
    const image = await uploadImage(blog.id, cookie)
    const created = await createArticle(
      blog.id,
      cookie,
      richTextJson("Sin imágenes en el cuerpo"),
      image.url,
    )

    expect(created.status).toBe(201)
    expect(created.data.coverImage).toBe(image.url)
    expect((await apiFetch(new Request(image.url))).status).toBe(200)
    expect(await mediaCount(blog.id)).toBe(1)

    const updated = await apiFetch(
      updateArticleRequest(blog.id, created.data.id, cookie, { coverImage: null }),
    )

    expect(updated.status).toBe(200)
    expect((await fetchArticle(blog.id, created.data.id, cookie)).coverImage).toBeNull()
    expect((await apiFetch(new Request(image.url))).status).toBe(404)
    expect(await mediaCount(blog.id)).toBe(0)
  })

  it("reemplaza la portada y borra la anterior", async () => {
    const { blog, cookie } = await setup()
    const first = await uploadImage(blog.id, cookie)
    const second = await uploadImage(blog.id, cookie)
    const created = await createArticle(
      blog.id,
      cookie,
      richTextJson("Sin imágenes en el cuerpo"),
      first.url,
    )

    expect(created.status).toBe(201)

    const updated = await apiFetch(
      updateArticleRequest(blog.id, created.data.id, cookie, { coverImage: second.url }),
    )

    expect(updated.status).toBe(200)
    expect((await fetchArticle(blog.id, created.data.id, cookie)).coverImage).toBe(second.url)
    expect((await apiFetch(new Request(first.url))).status).toBe(404)
    expect((await apiFetch(new Request(second.url))).status).toBe(200)
    expect(await mediaCount(blog.id)).toBe(1)
  })

  it("no permite reutilizar como portada una imagen de otro artículo", async () => {
    const { blog, cookie } = await setup()
    const image = await uploadImage(blog.id, cookie)

    const first = await createArticle(
      blog.id,
      cookie,
      richTextJson("Sin imágenes en el cuerpo"),
      image.url,
    )
    expect(first.status).toBe(201)

    const second = await createArticle(
      blog.id,
      cookie,
      richTextJson("Sin imágenes en el cuerpo"),
      image.url,
    )

    expect(second.status).toBe(409)
    expect((await apiFetch(new Request(image.url))).status).toBe(200)
  })

  it("borra la portada al eliminar el artículo", async () => {
    const { blog, cookie } = await setup()
    const image = await uploadImage(blog.id, cookie)
    const created = await createArticle(
      blog.id,
      cookie,
      richTextJson("Sin imágenes en el cuerpo"),
      image.url,
    )

    const deleted = await apiFetch(
      jsonRequest(`/api/admin/blogs/${blog.id}/articles/${created.data.id}`, {
        method: "DELETE",
        cookie,
      }),
    )

    expect(deleted.status).toBe(204)
    expect((await apiFetch(new Request(image.url))).status).toBe(404)
    expect(await mediaCount(blog.id)).toBe(0)
  })
})
