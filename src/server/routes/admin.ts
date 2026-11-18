import {
  articleCreateSchema,
  articleListQuerySchema,
  articleUpdateSchema,
  blogCreateSchema,
  blogListQuerySchema,
  blogUpdateSchema,
} from "@shared/schemas"
import { Hono } from "hono"

import { getDb } from "../db/client"
import { getArticleByBlogAndId, listArticlesByBlog } from "../db/repositories/articlesRepository"
import { countArticlesForBlog, listBlogs } from "../db/repositories/blogsRepository"
import { listMediaKeysByBlog } from "../db/repositories/mediaRepository"
import { getDashboardStats, getRecentArticles } from "../db/repositories/statsRepository"
import {
  toArticleDto,
  toArticleSummaryDto,
  toBlogDto,
  toMediaDto,
  toRecentArticleDto,
} from "../lib/dto"
import { ApiError } from "../lib/errors"
import { parseJson, parseQuery } from "../lib/validate"
import { requireAdmin, requireAuth } from "../middleware/auth"
import {
  createArticleForBlog,
  deleteArticleForBlog,
  updateArticleForBlog,
} from "../services/articleService"
import {
  createBlogFromInput,
  deleteBlogOrThrow,
  getBlogOrThrow,
  updateBlogFromInput,
} from "../services/blogService"
import { deleteBlogImage, deleteMediaObjects, storeImage } from "../services/mediaService"
import type { AppEnv } from "../types"

const adminRoutes = new Hono<AppEnv>()

adminRoutes.use("*", requireAuth)

adminRoutes.get("/blogs", async (c) => {
  const query = parseQuery(c, blogListQuerySchema)
  const db = getDb(c.env)
  const result = await listBlogs(db, query)

  return c.json({
    data: result.items.map((blog) => toBlogDto(blog)),
    meta: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    },
  })
})

adminRoutes.post("/blogs", requireAdmin, async (c) => {
  const input = await parseJson(c, blogCreateSchema)
  const blog = await createBlogFromInput(getDb(c.env), input)

  return c.json({ data: toBlogDto(blog, 0) }, 201)
})

adminRoutes.get("/blogs/:blogId", async (c) => {
  const db = getDb(c.env)
  const blog = await getBlogOrThrow(db, c.req.param("blogId"))
  const articleCount = await countArticlesForBlog(db, blog.id)

  return c.json({ data: toBlogDto(blog, articleCount) })
})

adminRoutes.patch("/blogs/:blogId", requireAdmin, async (c) => {
  const input = await parseJson(c, blogUpdateSchema)
  const db = getDb(c.env)
  const blog = await updateBlogFromInput(db, c.req.param("blogId"), input)
  const articleCount = await countArticlesForBlog(db, blog.id)

  return c.json({ data: toBlogDto(blog, articleCount) })
})

adminRoutes.delete("/blogs/:blogId", requireAdmin, async (c) => {
  const db = getDb(c.env)
  const blog = await getBlogOrThrow(db, c.req.param("blogId"))
  const mediaKeys = await listMediaKeysByBlog(db, blog.id)

  await deleteBlogOrThrow(db, blog.id)

  if (mediaKeys.length > 0) {
    c.executionCtx.waitUntil(deleteMediaObjects(c.env.MEDIA, mediaKeys))
  }

  return c.body(null, 204)
})

adminRoutes.get("/blogs/:blogId/articles", async (c) => {
  const db = getDb(c.env)
  const blog = await getBlogOrThrow(db, c.req.param("blogId"))
  const query = parseQuery(c, articleListQuerySchema)
  const result = await listArticlesByBlog(db, blog.id, query)

  return c.json({
    data: result.items.map((article) => toArticleSummaryDto(article)),
    meta: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    },
  })
})

adminRoutes.post("/blogs/:blogId/articles", async (c) => {
  const db = getDb(c.env)
  const blog = await getBlogOrThrow(db, c.req.param("blogId"))
  const input = await parseJson(c, articleCreateSchema)
  const article = await createArticleForBlog(db, blog.id, input)

  return c.json({ data: toArticleDto(article) }, 201)
})

adminRoutes.get("/blogs/:blogId/articles/:articleId", async (c) => {
  const db = getDb(c.env)
  const blog = await getBlogOrThrow(db, c.req.param("blogId"))
  const article = await getArticleByBlogAndId(db, blog.id, c.req.param("articleId"))

  if (!article) {
    throw new ApiError(404, "NOT_FOUND", "Artículo no encontrado")
  }

  return c.json({ data: toArticleDto(article) })
})

adminRoutes.patch("/blogs/:blogId/articles/:articleId", async (c) => {
  const db = getDb(c.env)
  const blog = await getBlogOrThrow(db, c.req.param("blogId"))
  const input = await parseJson(c, articleUpdateSchema)
  const article = await updateArticleForBlog(db, blog.id, c.req.param("articleId"), input)

  return c.json({ data: toArticleDto(article) })
})

adminRoutes.delete("/blogs/:blogId/articles/:articleId", async (c) => {
  const db = getDb(c.env)
  const blog = await getBlogOrThrow(db, c.req.param("blogId"))

  await deleteArticleForBlog(db, blog.id, c.req.param("articleId"))

  return c.body(null, 204)
})

adminRoutes.post("/blogs/:blogId/media", async (c) => {
  const db = getDb(c.env)
  const blog = await getBlogOrThrow(db, c.req.param("blogId"))
  let form: FormData

  try {
    form = await c.req.formData()
  } catch {
    throw new ApiError(400, "INVALID_FORM_DATA", "El cuerpo debe ser multipart/form-data")
  }

  const file = form.get("file")

  if (!(file instanceof File)) {
    throw new ApiError(400, "FILE_REQUIRED", "Adjunta una imagen en el campo «file»")
  }

  const media = await storeImage(c.env.MEDIA, db, blog.id, file)

  return c.json({ data: toMediaDto(media, new URL(c.req.url).origin) }, 201)
})

adminRoutes.delete("/blogs/:blogId/media/:mediaId", requireAdmin, async (c) => {
  const db = getDb(c.env)
  const blog = await getBlogOrThrow(db, c.req.param("blogId"))

  await deleteBlogImage(c.env.MEDIA, db, blog.id, c.req.param("mediaId"))

  return c.body(null, 204)
})

adminRoutes.get("/stats", async (c) => {
  const db = getDb(c.env)
  const [stats, recentArticles] = await Promise.all([
    getDashboardStats(db),
    getRecentArticles(db, 5),
  ])

  return c.json({
    data: {
      ...stats,
      recentArticles: recentArticles.map((article) => toRecentArticleDto(article)),
    },
  })
})

export { adminRoutes }
