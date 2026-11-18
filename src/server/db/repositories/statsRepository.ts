import { desc, eq, sql } from "drizzle-orm"

import type { Database } from "../client"
import { articles, blogs } from "../schema"
import type { ArticleSummary } from "./articlesRepository"

export type DashboardStats = {
  totalBlogs: number
  activeBlogs: number
  totalArticles: number
  publishedArticles: number
  draftArticles: number
  featuredArticles: number
}

export type RecentArticle = ArticleSummary & {
  blogName: string
  blogSlug: string
}

async function scalarCount(query: Promise<Array<{ count: number }>>): Promise<number> {
  const rows = await query
  return rows[0]?.count ?? 0
}

export async function getDashboardStats(db: Database): Promise<DashboardStats> {
  const [
    totalBlogs,
    activeBlogs,
    totalArticles,
    publishedArticles,
    draftArticles,
    featuredArticles,
  ] = await Promise.all([
    scalarCount(db.select({ count: sql<number>`count(*)` }).from(blogs)),
    scalarCount(
      db
        .select({ count: sql<number>`count(*)` })
        .from(blogs)
        .where(eq(blogs.isActive, true)),
    ),
    scalarCount(db.select({ count: sql<number>`count(*)` }).from(articles)),
    scalarCount(
      db
        .select({ count: sql<number>`count(*)` })
        .from(articles)
        .where(sql`${articles.status} in ('published', 'featured')`),
    ),
    scalarCount(
      db
        .select({ count: sql<number>`count(*)` })
        .from(articles)
        .where(eq(articles.status, "draft")),
    ),
    scalarCount(
      db
        .select({ count: sql<number>`count(*)` })
        .from(articles)
        .where(eq(articles.status, "featured")),
    ),
  ])

  return {
    totalBlogs,
    activeBlogs,
    totalArticles,
    publishedArticles,
    draftArticles,
    featuredArticles,
  }
}

export async function getRecentArticles(db: Database, limit = 5): Promise<RecentArticle[]> {
  return db
    .select({
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
      blogName: blogs.name,
      blogSlug: blogs.slug,
    })
    .from(articles)
    .innerJoin(blogs, eq(articles.blogId, blogs.id))
    .orderBy(desc(articles.updatedAt))
    .limit(Math.min(20, Math.max(1, limit)))
}
