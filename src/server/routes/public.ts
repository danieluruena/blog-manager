import { publicArticleListQuerySchema } from "@shared/schemas"
import { Hono } from "hono"
import type { Context } from "hono"

import { getDb } from "../db/client"
import {
  getPublicArticleByBlogSlug,
  listPublicArticlesByBlog,
} from "../db/repositories/articlesRepository"
import { getBlogBySlug } from "../db/repositories/blogsRepository"
import { decodeCursor } from "../lib/cursor"
import { toPublicArticleDto, toPublicArticleSummaryDto, toPublicBlogDto } from "../lib/dto"
import { ApiError } from "../lib/errors"
import { applyPublicCors } from "../lib/origins"
import { parseQuery } from "../lib/validate"
import type { AppEnv } from "../types"

const publicRoutes = new Hono<AppEnv>()

const PUBLIC_CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=300"

async function getActiveBlog(c: Context<AppEnv>, blogSlug: string) {
  const blog = await getBlogBySlug(getDb(c.env), blogSlug, true)

  if (!blog) {
    throw new ApiError(404, "NOT_FOUND", "Blog no encontrado")
  }

  applyPublicCors(c, blog)
  c.header("Cache-Control", PUBLIC_CACHE_CONTROL)

  return blog
}

publicRoutes.get("/blogs/:blogSlug", async (c) => {
  const blog = await getActiveBlog(c, c.req.param("blogSlug") ?? "")

  return c.json({ data: toPublicBlogDto(blog) })
})

publicRoutes.get("/blogs/:blogSlug/articles", async (c) => {
  const blog = await getActiveBlog(c, c.req.param("blogSlug") ?? "")
  const query = parseQuery(c, publicArticleListQuerySchema)
  const cursor = query.cursor ? decodeCursor(query.cursor) : null

  if (query.cursor && !cursor) {
    throw new ApiError(400, "INVALID_CURSOR", "El cursor no es válido")
  }

  const result = await listPublicArticlesByBlog(getDb(c.env), blog.id, {
    limit: query.limit,
    cursor,
    featured: query.featured,
  })

  return c.json({
    data: result.items.map((article) => toPublicArticleSummaryDto(article)),
    meta: {
      nextCursor: result.nextCursor,
    },
  })
})

publicRoutes.get("/blogs/:blogSlug/articles/:articleSlug", async (c) => {
  const blogSlug = c.req.param("blogSlug") ?? ""
  const articleSlug = c.req.param("articleSlug") ?? ""

  await getActiveBlog(c, blogSlug)

  const result = await getPublicArticleByBlogSlug(getDb(c.env), blogSlug, articleSlug)

  if (!result) {
    throw new ApiError(404, "NOT_FOUND", "Artículo no encontrado")
  }

  return c.json({ data: toPublicArticleDto(result.article, result.blog) })
})

publicRoutes.options("/blogs/:blogSlug", async (c) => {
  await getActiveBlog(c, c.req.param("blogSlug") ?? "")
  return c.body(null, 204)
})

publicRoutes.options("/blogs/:blogSlug/articles", async (c) => {
  await getActiveBlog(c, c.req.param("blogSlug") ?? "")
  return c.body(null, 204)
})

publicRoutes.options("/blogs/:blogSlug/articles/:articleSlug", async (c) => {
  await getActiveBlog(c, c.req.param("blogSlug") ?? "")
  return c.body(null, 204)
})

export { publicRoutes }
