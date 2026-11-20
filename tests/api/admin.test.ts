import { beforeEach, describe, expect, it } from "vitest"

import {
  apiFetch,
  clearDatabase,
  createTestArticle,
  createTestBlog,
  createTestUser,
  grantBlogPermission,
  jsonRequest,
  loginAs,
  richTextJson,
} from "./helpers"

beforeEach(async () => {
  await clearDatabase()
})

async function setupAdmin() {
  const admin = await createTestUser({ email: "admin@example.com", role: "admin" })
  const editor = await createTestUser({ email: "editor@example.com", role: "editor" })
  const adminLogin = await loginAs(admin)
  const editorLogin = await loginAs(editor)

  return {
    admin,
    editor,
    adminCookie: adminLogin.cookie,
    editorCookie: editorLogin.cookie,
  }
}

describe("admin API", () => {
  it("exige autenticación", async () => {
    const response = await apiFetch(jsonRequest("/api/admin/blogs"))

    expect(response.status).toBe(401)
  })

  it("permite al admin crear, listar, actualizar y borrar blogs", async () => {
    const { adminCookie } = await setupAdmin()

    const create = await apiFetch(
      jsonRequest("/api/admin/blogs", {
        method: "POST",
        cookie: adminCookie,
        body: {
          name: "Blog de la Página A",
          description: "Noticias de la Página A",
          siteUrl: "https://pagina-a.example",
          allowedOrigins: ["https://www.pagina-a.example"],
        },
      }),
    )

    expect(create.status).toBe(201)

    const created = (await create.json()) as {
      data: {
        id: string
        slug: string
        articleCount: number
        allowedOrigins: string[]
      }
    }

    expect(created.data.slug).toBe("blog-de-la-pagina-a")
    expect(created.data.articleCount).toBe(0)
    expect(created.data.allowedOrigins).toEqual(["https://www.pagina-a.example"])

    const list = await apiFetch(
      jsonRequest("/api/admin/blogs?q=pagina&page=1&pageSize=10", {
        cookie: adminCookie,
      }),
    )

    expect(list.status).toBe(200)

    const listBody = (await list.json()) as {
      data: Array<{ id: string }>
      meta: { total: number; page: number; pageSize: number }
    }

    expect(listBody.meta).toEqual({ total: 1, page: 1, pageSize: 10 })
    expect(listBody.data).toHaveLength(1)

    const update = await apiFetch(
      jsonRequest(`/api/admin/blogs/${created.data.id}`, {
        method: "PATCH",
        cookie: adminCookie,
        body: { isActive: false, name: "Blog actualizado" },
      }),
    )

    expect(update.status).toBe(200)

    const updated = (await update.json()) as {
      data: { name: string; isActive: boolean; articleCount: number }
    }

    expect(updated.data.name).toBe("Blog actualizado")
    expect(updated.data.isActive).toBe(false)
    expect(updated.data.articleCount).toBe(0)

    const detail = await apiFetch(
      jsonRequest(`/api/admin/blogs/${created.data.id}`, {
        cookie: adminCookie,
      }),
    )
    expect(detail.status).toBe(200)

    const remove = await apiFetch(
      jsonRequest(`/api/admin/blogs/${created.data.id}`, {
        method: "DELETE",
        cookie: adminCookie,
      }),
    )
    expect(remove.status).toBe(204)
  })

  it("valida duplicados y URLs inválidas", async () => {
    const { adminCookie } = await setupAdmin()

    const first = await apiFetch(
      jsonRequest("/api/admin/blogs", {
        method: "POST",
        cookie: adminCookie,
        body: {
          name: "Blog A",
          slug: "blog-a",
          siteUrl: "https://blog-a.example",
        },
      }),
    )
    expect(first.status).toBe(201)

    const duplicate = await apiFetch(
      jsonRequest("/api/admin/blogs", {
        method: "POST",
        cookie: adminCookie,
        body: {
          name: "Otro blog",
          slug: "blog-a",
          siteUrl: "https://otro.example",
        },
      }),
    )
    expect(duplicate.status).toBe(409)

    const invalidUrl = await apiFetch(
      jsonRequest("/api/admin/blogs", {
        method: "POST",
        cookie: adminCookie,
        body: {
          name: "Blog inválido",
          siteUrl: "ftp://blog.example",
        },
      }),
    )
    expect(invalidUrl.status).toBe(400)
  })

  it("impide que un editor cree blogs pero le permite crear artículos", async () => {
    const { editor, editorCookie } = await setupAdmin()
    const blog = await createTestBlog({ name: "Blog del editor" })
    await grantBlogPermission(editor.id, blog.id, "write")

    const createBlog = await apiFetch(
      jsonRequest("/api/admin/blogs", {
        method: "POST",
        cookie: editorCookie,
        body: {
          name: "Blog del editor",
          siteUrl: "https://editor.example",
        },
      }),
    )
    expect(createBlog.status).toBe(403)

    const createArticle = await apiFetch(
      jsonRequest(`/api/admin/blogs/${blog.id}/articles`, {
        method: "POST",
        cookie: editorCookie,
        body: {
          title: "Artículo del editor",
          author: "Editor",
          excerpt: "Resumen",
          bodyJson: richTextJson("Contenido"),
        },
      }),
    )
    expect(createArticle.status).toBe(201)
  })

  it("rechaza una URL de portada no válida", async () => {
    const { adminCookie } = await setupAdmin()
    const blog = await createTestBlog({ name: "Blog de validación" })

    const response = await apiFetch(
      jsonRequest(`/api/admin/blogs/${blog.id}/articles`, {
        method: "POST",
        cookie: adminCookie,
        body: {
          title: "Portada inválida",
          author: "Admin",
          bodyJson: richTextJson("Hola"),
          coverImage: "javascript:alert(1)",
        },
      }),
    )

    expect(response.status).toBe(400)
  })

  it("gestiona artículos, publica y bloquea el borrado del blog", async () => {
    const { adminCookie } = await setupAdmin()
    const blog = await createTestBlog({ name: "Blog con artículos" })

    const create = await apiFetch(
      jsonRequest(`/api/admin/blogs/${blog.id}/articles`, {
        method: "POST",
        cookie: adminCookie,
        body: {
          title: "Cómo empezar",
          author: "Daniel",
          excerpt: "Una introducción",
          bodyJson: richTextJson("Hola"),
          coverImage: "https://media.example.com/portada.webp",
        },
      }),
    )

    expect(create.status).toBe(201)

    const created = (await create.json()) as {
      data: {
        id: string
        slug: string
        status: string
        coverImage: string | null
        publishedAt: string | null
      }
    }

    expect(created.data.slug).toBe("como-empezar")
    expect(created.data.status).toBe("draft")
    expect(created.data.coverImage).toBe("https://media.example.com/portada.webp")
    expect(created.data.publishedAt).toBeNull()

    const publish = await apiFetch(
      jsonRequest(`/api/admin/blogs/${blog.id}/articles/${created.data.id}`, {
        method: "PATCH",
        cookie: adminCookie,
        body: { status: "published" },
      }),
    )

    expect(publish.status).toBe(200)

    const published = (await publish.json()) as {
      data: { status: string; publishedAt: string | null }
    }

    expect(published.data.status).toBe("published")
    expect(published.data.publishedAt).not.toBeNull()

    const list = await apiFetch(
      jsonRequest(`/api/admin/blogs/${blog.id}/articles?status=published`, {
        cookie: adminCookie,
      }),
    )

    expect(list.status).toBe(200)

    const listBody = (await list.json()) as {
      data: Array<{ id: string; coverImage: string | null }>
      meta: { total: number }
    }

    expect(listBody.meta.total).toBe(1)
    expect(listBody.data[0]?.id).toBe(created.data.id)
    expect(listBody.data[0]?.coverImage).toBe("https://media.example.com/portada.webp")

    const detail = await apiFetch(
      jsonRequest(`/api/admin/blogs/${blog.id}/articles/${created.data.id}`, {
        cookie: adminCookie,
      }),
    )
    expect(detail.status).toBe(200)

    const detailBody = (await detail.json()) as {
      data: { body: string; bodyJson: string | null; coverImage: string | null }
    }
    expect(detailBody.data.body).toBe("<p>Hola</p>")
    expect(detailBody.data.bodyJson).toContain("Hola")
    expect(detailBody.data.coverImage).toBe("https://media.example.com/portada.webp")

    const deleteBlog = await apiFetch(
      jsonRequest(`/api/admin/blogs/${blog.id}`, {
        method: "DELETE",
        cookie: adminCookie,
      }),
    )

    expect(deleteBlog.status).toBe(409)

    const deleteBody = (await deleteBlog.json()) as {
      error: { code: string; details: { articleCount: number } }
    }

    expect(deleteBody.error.code).toBe("BLOG_HAS_ARTICLES")
    expect(deleteBody.error.details.articleCount).toBe(1)

    const deleteArticle = await apiFetch(
      jsonRequest(`/api/admin/blogs/${blog.id}/articles/${created.data.id}`, {
        method: "DELETE",
        cookie: adminCookie,
      }),
    )
    expect(deleteArticle.status).toBe(204)

    const deleteBlogAgain = await apiFetch(
      jsonRequest(`/api/admin/blogs/${blog.id}`, {
        method: "DELETE",
        cookie: adminCookie,
      }),
    )
    expect(deleteBlogAgain.status).toBe(204)
  })

  it("aísla los artículos por blog", async () => {
    const { adminCookie } = await setupAdmin()
    const blogA = await createTestBlog({ name: "Blog A" })
    const blogB = await createTestBlog({ name: "Blog B" })
    const articleA = await createTestArticle(blogA.id, { title: "Solo de A" })

    const response = await apiFetch(
      jsonRequest(`/api/admin/blogs/${blogB.id}/articles/${articleA.id}`, {
        cookie: adminCookie,
      }),
    )

    expect(response.status).toBe(404)
  })

  it("devuelve las métricas del panel", async () => {
    const { adminCookie } = await setupAdmin()
    const blog = await createTestBlog({ name: "Blog de métricas" })

    await createTestArticle(blog.id, {
      status: "published",
      publishedAt: "2026-11-18T10:00:00.000Z",
    })
    await createTestArticle(blog.id, {
      status: "featured",
      publishedAt: "2026-11-18T11:00:00.000Z",
    })
    await createTestArticle(blog.id, { status: "draft" })

    const response = await apiFetch(
      jsonRequest("/api/admin/stats", {
        cookie: adminCookie,
      }),
    )

    expect(response.status).toBe(200)

    const body = (await response.json()) as {
      data: {
        totalBlogs: number
        activeBlogs: number
        totalArticles: number
        publishedArticles: number
        draftArticles: number
        featuredArticles: number
        recentArticles: unknown[]
      }
    }

    expect(body.data).toMatchObject({
      totalBlogs: 1,
      activeBlogs: 1,
      totalArticles: 3,
      publishedArticles: 2,
      draftArticles: 1,
      featuredArticles: 1,
    })
    expect(body.data.recentArticles).toHaveLength(3)
  })
})
