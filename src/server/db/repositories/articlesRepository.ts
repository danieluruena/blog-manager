import { and, asc, desc, eq, inArray, isNotNull, ne, sql, type SQL } from "drizzle-orm"

import type { Database } from "../client"
import { encodeCursor, type ArticleCursor } from "../../lib/cursor"
import {
  articles,
  articleStatusValues,
  blogs,
  type Article,
  type ArticleStatus,
  type NewArticle,
} from "../schema"

type ArticleSort = "updated_at" | "published_at" | "created_at" | "title"

export type ArticleSummary = Pick<
  Article,
  | "id"
  | "blogId"
  | "title"
  | "slug"
  | "excerpt"
  | "author"
  | "status"
  | "createdAt"
  | "publishedAt"
  | "updatedAt"
>

export type ListArticlesFilters = {
  q?: string
  status?: ArticleStatus
  page?: number
  pageSize?: number
  sort?: ArticleSort
}

export type PaginatedArticles = {
  items: ArticleSummary[]
  total: number
  page: number
  pageSize: number
}

export type PublicArticlesPage = {
  items: ArticleSummary[]
  nextCursor: string | null
}

const summaryColumns = {
  id: articles.id,
  blogId: articles.blogId,
  title: articles.title,
  slug: articles.slug,
  excerpt: articles.excerpt,
  author: articles.author,
  status: articles.status,
  createdAt: articles.createdAt,
  publishedAt: articles.publishedAt,
  updatedAt: articles.updatedAt,
}

const visibleStatuses: ArticleStatus[] = ["published", "featured"]

export async function listArticlesByBlog(
  db: Database,
  blogId: string,
  filters: ListArticlesFilters = {},
): Promise<PaginatedArticles> {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20))
  const conditions: SQL[] = [eq(articles.blogId, blogId)]

  if (filters.q?.trim()) {
    const term = `%${filters.q.trim().toLowerCase()}%`
    conditions.push(
      sql`(lower(${articles.title}) like ${term} or lower(${articles.excerpt}) like ${term})`,
    )
  }

  if (filters.status) {
    conditions.push(eq(articles.status, filters.status))
  }

  const where = and(...conditions)
  const orderBy =
    filters.sort === "title"
      ? asc(articles.title)
      : filters.sort === "published_at"
        ? desc(articles.publishedAt)
        : filters.sort === "created_at"
          ? desc(articles.createdAt)
          : desc(articles.updatedAt)

  const [items, countRows] = await Promise.all([
    db
      .select(summaryColumns)
      .from(articles)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(where),
  ])

  return {
    items,
    total: countRows[0]?.count ?? 0,
    page,
    pageSize,
  }
}

export async function getArticleByBlogAndId(
  db: Database,
  blogId: string,
  articleId: string,
): Promise<Article | null> {
  const rows = await db
    .select()
    .from(articles)
    .where(and(eq(articles.id, articleId), eq(articles.blogId, blogId)))
    .limit(1)

  return rows[0] ?? null
}

export async function getArticleByBlogAndSlug(
  db: Database,
  blogId: string,
  slug: string,
): Promise<Article | null> {
  const rows = await db
    .select()
    .from(articles)
    .where(and(eq(articles.blogId, blogId), eq(articles.slug, slug)))
    .limit(1)

  return rows[0] ?? null
}

export async function articleSlugExists(
  db: Database,
  blogId: string,
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const conditions = [eq(articles.blogId, blogId), eq(articles.slug, slug)]

  if (excludeId) {
    conditions.push(ne(articles.id, excludeId))
  }

  const rows = await db
    .select({ id: articles.id })
    .from(articles)
    .where(and(...conditions))
    .limit(1)

  return rows.length > 0
}

export async function createArticle(db: Database, input: NewArticle): Promise<Article> {
  const [article] = await db.insert(articles).values(input).returning()

  if (!article) {
    throw new Error("No se pudo crear el artículo")
  }

  return article
}

export async function updateArticle(
  db: Database,
  blogId: string,
  articleId: string,
  input: Partial<Omit<NewArticle, "id" | "blogId" | "createdAt">>,
): Promise<Article | null> {
  const [article] = await db
    .update(articles)
    .set(input)
    .where(and(eq(articles.id, articleId), eq(articles.blogId, blogId)))
    .returning()

  return article ?? null
}

export async function deleteArticle(
  db: Database,
  blogId: string,
  articleId: string,
): Promise<boolean> {
  const rows = await db
    .delete(articles)
    .where(and(eq(articles.id, articleId), eq(articles.blogId, blogId)))
    .returning({ id: articles.id })

  return rows.length > 0
}

export async function countArticlesByBlog(
  db: Database,
  blogId: string,
  statuses?: ArticleStatus[],
): Promise<number> {
  const conditions: SQL[] = [eq(articles.blogId, blogId)]

  if (statuses && statuses.length > 0) {
    conditions.push(inArray(articles.status, statuses))
  }

  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .where(and(...conditions))

  return rows[0]?.count ?? 0
}

export async function listPublicArticlesByBlog(
  db: Database,
  blogId: string,
  options: { limit?: number; cursor?: ArticleCursor | null; featured?: boolean } = {},
): Promise<PublicArticlesPage> {
  const limit = Math.min(50, Math.max(1, options.limit ?? 10))
  const conditions: SQL[] = [
    eq(articles.blogId, blogId),
    inArray(articles.status, visibleStatuses),
    isNotNull(articles.publishedAt),
  ]

  if (options.featured) {
    conditions.push(eq(articles.status, "featured"))
  }

  if (options.cursor) {
    conditions.push(
      sql`(${articles.publishedAt}, ${articles.id}) < (${options.cursor.publishedAt}, ${options.cursor.id})`,
    )
  }

  const rows = await db
    .select(summaryColumns)
    .from(articles)
    .where(and(...conditions))
    .orderBy(desc(articles.publishedAt), desc(articles.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const last = items.at(-1)

  return {
    items,
    nextCursor:
      hasMore && last?.publishedAt
        ? encodeCursor({ publishedAt: last.publishedAt, id: last.id })
        : null,
  }
}

export async function getPublicArticleByBlogSlug(
  db: Database,
  blogSlug: string,
  articleSlug: string,
): Promise<{ article: Article; blog: { name: string; slug: string; siteUrl: string } } | null> {
  const rows = await db
    .select({
      article: articles,
      blog: {
        name: blogs.name,
        slug: blogs.slug,
        siteUrl: blogs.siteUrl,
      },
    })
    .from(articles)
    .innerJoin(blogs, eq(articles.blogId, blogs.id))
    .where(
      and(
        eq(blogs.slug, blogSlug),
        eq(blogs.isActive, true),
        eq(articles.slug, articleSlug),
        inArray(articles.status, visibleStatuses),
        isNotNull(articles.publishedAt),
      ),
    )
    .limit(1)

  return rows[0] ?? null
}

export function isVisibleStatus(status: ArticleStatus): boolean {
  return visibleStatuses.includes(status)
}

export function isArticleStatus(value: string): value is ArticleStatus {
  return articleStatusValues.includes(value as ArticleStatus)
}
