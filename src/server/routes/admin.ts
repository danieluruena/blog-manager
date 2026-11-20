import {
  adminUserCreateSchema,
  adminUserUpdateSchema,
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
import { deleteBlogMedia, deleteMediaObjects, storeMedia } from "../services/mediaService"
import { requireBlogPermission } from "../services/permissionService"
import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  updateAdminUser,
} from "../services/userService"
import type { AppEnv } from "../types"

const adminRoutes = new Hono<AppEnv>()

adminRoutes.use("*", requireAuth)

adminRoutes.get("/blogs", async (c) => {
  const query = parseQuery(c, blogListQuerySchema)
  const db = getDb(c.env)
  const user = c.get("user")
  const result = await listBlogs(db, {
    ...query,
    userId: user.role === "admin" ? undefined : user.id,
  })

  return c.json({
    data: result.items.map((blog) =>
      toBlogDto(blog, blog.articleCount, blog.permission ?? "write"),
    ),
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
  const permission = await requireBlogPermission(db, c.get("user"), blog.id, "read")
  const articleCount = await countArticlesForBlog(db, blog.id)

  return c.json({ data: toBlogDto(blog, articleCount, permission) })
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
  await requireBlogPermission(db, c.get("user"), blog.id, "read")
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
  await requireBlogPermission(db, c.get("user"), blog.id, "write")
  const input = await parseJson(c, articleCreateSchema)
  const article = await createArticleForBlog(db, blog.id, input, c.env.MEDIA)

  return c.json({ data: toArticleDto(article) }, 201)
})

adminRoutes.get("/blogs/:blogId/articles/:articleId", async (c) => {
  const db = getDb(c.env)
  const blog = await getBlogOrThrow(db, c.req.param("blogId"))
  await requireBlogPermission(db, c.get("user"), blog.id, "read")
  const article = await getArticleByBlogAndId(db, blog.id, c.req.param("articleId"))

  if (!article) {
    throw new ApiError(404, "NOT_FOUND", "Artículo no encontrado")
  }

  return c.json({ data: toArticleDto(article) })
})

adminRoutes.patch("/blogs/:blogId/articles/:articleId", async (c) => {
  const db = getDb(c.env)
  const blog = await getBlogOrThrow(db, c.req.param("blogId"))
  await requireBlogPermission(db, c.get("user"), blog.id, "write")
  const input = await parseJson(c, articleUpdateSchema)
  const article = await updateArticleForBlog(
    db,
    blog.id,
    c.req.param("articleId"),
    input,
    c.env.MEDIA,
  )

  return c.json({ data: toArticleDto(article) })
})

adminRoutes.delete("/blogs/:blogId/articles/:articleId", async (c) => {
  const db = getDb(c.env)
  const blog = await getBlogOrThrow(db, c.req.param("blogId"))
  await requireBlogPermission(db, c.get("user"), blog.id, "write")

  await deleteArticleForBlog(db, blog.id, c.req.param("articleId"), c.env.MEDIA)

  return c.body(null, 204)
})

adminRoutes.post("/blogs/:blogId/media", async (c) => {
  const db = getDb(c.env)
  const blog = await getBlogOrThrow(db, c.req.param("blogId"))
  await requireBlogPermission(db, c.get("user"), blog.id, "write")
  let form: FormData

  try {
    form = await c.req.formData()
  } catch {
    throw new ApiError(400, "INVALID_FORM_DATA", "El cuerpo debe ser multipart/form-data")
  }

  const file = form.get("file")

  if (!(file instanceof File)) {
    throw new ApiError(400, "FILE_REQUIRED", "Adjunta un archivo en el campo «file»")
  }

  const media = await storeMedia(c.env.MEDIA, db, blog.id, file)

  return c.json({ data: toMediaDto(media, new URL(c.req.url).origin) }, 201)
})

adminRoutes.delete("/blogs/:blogId/media/:mediaId", requireAdmin, async (c) => {
  const db = getDb(c.env)
  const blog = await getBlogOrThrow(db, c.req.param("blogId"))

  await deleteBlogMedia(c.env.MEDIA, db, blog.id, c.req.param("mediaId"))

  return c.body(null, 204)
})

adminRoutes.get("/users", requireAdmin, async (c) => {
  const users = await listAdminUsers(getDb(c.env))

  return c.json({ data: users })
})

adminRoutes.post("/users", requireAdmin, async (c) => {
  const input = await parseJson(c, adminUserCreateSchema)
  const user = await createAdminUser(getDb(c.env), input, c.env.AUTH_PEPPER)

  return c.json({ data: user }, 201)
})

adminRoutes.patch("/users/:userId", requireAdmin, async (c) => {
  const input = await parseJson(c, adminUserUpdateSchema)
  const user = await updateAdminUser(getDb(c.env), c.get("user").id, c.req.param("userId"), input)

  return c.json({ data: user })
})

adminRoutes.delete("/users/:userId", requireAdmin, async (c) => {
  await deleteAdminUser(getDb(c.env), c.get("user").id, c.req.param("userId"))

  return c.body(null, 204)
})

adminRoutes.get("/stats", requireAdmin, async (c) => {
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
