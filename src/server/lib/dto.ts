import type { Article, Blog, User } from "../db/schema"
import type { ArticleSummary } from "../db/repositories/articlesRepository"
import type { BlogListItem } from "../db/repositories/blogsRepository"
import type { DashboardStats, RecentArticle } from "../db/repositories/statsRepository"
import { parseOrigins } from "./origins"

export type UserDto = {
  id: string
  email: string
  name: string
  role: User["role"]
}

export type BlogDto = {
  id: string
  name: string
  slug: string
  description: string
  siteUrl: string
  allowedOrigins: string[]
  isActive: boolean
  articleCount?: number
  createdAt: string
  updatedAt: string
}

export type PublicBlogDto = {
  name: string
  slug: string
  description: string
  siteUrl: string
}

export type ArticleSummaryDto = {
  id: string
  blogId: string
  title: string
  slug: string
  excerpt: string
  author: string
  status: Article["status"]
  createdAt: string
  publishedAt: string | null
  updatedAt: string
}

export type ArticleDto = ArticleSummaryDto & {
  body: string
}

export type PublicArticleSummaryDto = Omit<ArticleSummaryDto, "blogId">

export type PublicArticleDto = PublicArticleSummaryDto & {
  body: string
  blog: {
    name: string
    slug: string
    siteUrl: string
  }
}

export type StatsDto = DashboardStats & {
  recentArticles: Array<
    ArticleSummaryDto & {
      blogName: string
      blogSlug: string
    }
  >
}

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }
}

export function toBlogDto(blog: Blog | BlogListItem, articleCount?: number): BlogDto {
  const count = "articleCount" in blog ? blog.articleCount : articleCount

  return {
    id: blog.id,
    name: blog.name,
    slug: blog.slug,
    description: blog.description,
    siteUrl: blog.siteUrl,
    allowedOrigins: parseOrigins(blog.allowedOrigins),
    isActive: blog.isActive,
    ...(count !== undefined ? { articleCount: count } : {}),
    createdAt: blog.createdAt,
    updatedAt: blog.updatedAt,
  }
}

export function toPublicBlogDto(blog: Blog): PublicBlogDto {
  return {
    name: blog.name,
    slug: blog.slug,
    description: blog.description,
    siteUrl: blog.siteUrl,
  }
}

export function toArticleSummaryDto(article: ArticleSummary): ArticleSummaryDto {
  return {
    id: article.id,
    blogId: article.blogId,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    author: article.author,
    status: article.status,
    createdAt: article.createdAt,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
  }
}

export function toArticleDto(article: Article): ArticleDto {
  return {
    ...toArticleSummaryDto(article),
    body: article.body,
  }
}

export function toPublicArticleSummaryDto(article: ArticleSummary): PublicArticleSummaryDto {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    author: article.author,
    status: article.status,
    createdAt: article.createdAt,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
  }
}

export function toPublicArticleDto(
  article: Article,
  blog: PublicArticleDto["blog"],
): PublicArticleDto {
  return {
    ...toPublicArticleSummaryDto(article),
    body: article.body,
    blog,
  }
}

export function toRecentArticleDto(article: RecentArticle): ArticleSummaryDto & {
  blogName: string
  blogSlug: string
} {
  return {
    ...toArticleSummaryDto(article),
    blogName: article.blogName,
    blogSlug: article.blogSlug,
  }
}
