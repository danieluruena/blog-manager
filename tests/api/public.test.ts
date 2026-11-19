import { beforeEach, describe, expect, it } from "vitest"

import { apiFetch, clearDatabase, createTestArticle, createTestBlog, jsonRequest } from "./helpers"

beforeEach(async () => {
  await clearDatabase()
})

async function setupPublicData() {
  const blog = await createTestBlog({
    name: "Blog público",
    slug: "pagina-a",
    siteUrl: "https://site-a.example",
    allowedOrigins: "https://allowed.example",
  })
  const otherBlog = await createTestBlog({
    name: "Otro blog",
    slug: "pagina-b",
    siteUrl: "https://site-b.example",
  })

  const published = await createTestArticle(blog.id, {
    title: "Publicado",
    slug: "publicado",
    status: "published",
    coverImage: "https://media.example.com/portada.webp",
    publishedAt: "2026-11-10T10:00:00.000Z",
  })
  const featured = await createTestArticle(blog.id, {
    title: "Destacado",
    slug: "destacado",
    status: "featured",
    publishedAt: "2026-11-12T10:00:00.000Z",
  })
  const draft = await createTestArticle(blog.id, {
    title: "Borrador",
    slug: "borrador",
    status: "draft",
  })
  const hidden = await createTestArticle(blog.id, {
    title: "Oculto",
    slug: "oculto",
    status: "hidden",
    publishedAt: "2026-11-11T10:00:00.000Z",
  })
  const otherArticle = await createTestArticle(otherBlog.id, {
    title: "Artículo de otro blog",
    slug: "otro-articulo",
    status: "published",
    publishedAt: "2026-11-09T10:00:00.000Z",
  })

  return { blog, otherBlog, published, featured, draft, hidden, otherArticle }
}

describe("public API", () => {
  it("devuelve el blog activo y oculta los inactivos", async () => {
    await setupPublicData()
    const inactive = await createTestBlog({
      slug: "inactivo",
      name: "Blog inactivo",
      isActive: false,
    })

    const response = await apiFetch(jsonRequest("/api/public/v1/blogs/pagina-a"))
    expect(response.status).toBe(200)

    const body = (await response.json()) as { data: { name: string; slug: string } }
    expect(body.data).toEqual(
      expect.objectContaining({
        name: "Blog público",
        slug: "pagina-a",
      }),
    )

    const inactiveResponse = await apiFetch(jsonRequest(`/api/public/v1/blogs/${inactive.slug}`))
    expect(inactiveResponse.status).toBe(404)
  })

  it("solo lista artículos publicados o destacados", async () => {
    const { featured, published } = await setupPublicData()

    const response = await apiFetch(jsonRequest("/api/public/v1/blogs/pagina-a/articles"))

    expect(response.status).toBe(200)

    const body = (await response.json()) as {
      data: Array<{ id: string; slug: string }>
      meta: { nextCursor: string | null }
    }

    expect(body.data.map((article) => article.id)).toEqual([featured.id, published.id])
    expect(body.meta.nextCursor).toBeNull()
  })

  it("pagina con cursor y filtra destacados", async () => {
    const { featured, published } = await setupPublicData()

    const firstPage = await apiFetch(jsonRequest("/api/public/v1/blogs/pagina-a/articles?limit=1"))
    expect(firstPage.status).toBe(200)

    const firstBody = (await firstPage.json()) as {
      data: Array<{ id: string }>
      meta: { nextCursor: string | null }
    }

    expect(firstBody.data[0]?.id).toBe(featured.id)
    expect(firstBody.meta.nextCursor).not.toBeNull()

    const secondPage = await apiFetch(
      jsonRequest(
        `/api/public/v1/blogs/pagina-a/articles?limit=1&cursor=${encodeURIComponent(
          firstBody.meta.nextCursor ?? "",
        )}`,
      ),
    )
    expect(secondPage.status).toBe(200)

    const secondBody = (await secondPage.json()) as {
      data: Array<{ id: string }>
      meta: { nextCursor: string | null }
    }

    expect(secondBody.data[0]?.id).toBe(published.id)
    expect(secondBody.meta.nextCursor).toBeNull()

    const featuredOnly = await apiFetch(
      jsonRequest("/api/public/v1/blogs/pagina-a/articles?featured=true"),
    )
    expect(featuredOnly.status).toBe(200)

    const featuredBody = (await featuredOnly.json()) as {
      data: Array<{ id: string }>
    }

    expect(featuredBody.data.map((article) => article.id)).toEqual([featured.id])
  })

  it("devuelve el detalle visible y no filtra artículos de otros blogs", async () => {
    await setupPublicData()

    const detail = await apiFetch(jsonRequest("/api/public/v1/blogs/pagina-a/articles/publicado"))

    expect(detail.status).toBe(200)

    const body = (await detail.json()) as {
      data: { body: string; coverImage: string | null; blog: { slug: string } }
    }

    expect(body.data.body).toContain("<p>Cuerpo del artículo</p>")
    expect(body.data.coverImage).toBe("https://media.example.com/portada.webp")
    expect(body.data.blog.slug).toBe("pagina-a")

    for (const slug of ["borrador", "oculto", "otro-articulo"]) {
      const response = await apiFetch(jsonRequest(`/api/public/v1/blogs/pagina-a/articles/${slug}`))
      expect(response.status).toBe(404)
    }
  })

  it("aplica CORS según el origen del blog", async () => {
    await setupPublicData()

    const allowedBySite = await apiFetch(
      jsonRequest("/api/public/v1/blogs/pagina-a/articles", {
        origin: "https://site-a.example",
      }),
    )
    expect(allowedBySite.headers.get("access-control-allow-origin")).toBe("https://site-a.example")
    expect(allowedBySite.headers.get("vary")).toContain("Origin")

    const allowedByExtraOrigin = await apiFetch(
      jsonRequest("/api/public/v1/blogs/pagina-a/articles", {
        origin: "https://allowed.example",
      }),
    )
    expect(allowedByExtraOrigin.headers.get("access-control-allow-origin")).toBe(
      "https://allowed.example",
    )

    const disallowed = await apiFetch(
      jsonRequest("/api/public/v1/blogs/pagina-a/articles", {
        origin: "https://evil.example",
      }),
    )
    expect(disallowed.headers.get("access-control-allow-origin")).toBeNull()

    const preflight = await apiFetch(
      jsonRequest("/api/public/v1/blogs/pagina-a/articles", {
        method: "OPTIONS",
        origin: "https://allowed.example",
      }),
    )
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get("access-control-allow-origin")).toBe("https://allowed.example")
  })

  it("rechaza cursores inválidos", async () => {
    await setupPublicData()

    const response = await apiFetch(
      jsonRequest("/api/public/v1/blogs/pagina-a/articles?cursor=no-es-un-cursor"),
    )

    expect(response.status).toBe(400)

    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe("INVALID_CURSOR")
  })
})
