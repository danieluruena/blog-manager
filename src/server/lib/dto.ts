import type {
  ArticleDto,
  ArticleSummaryDto,
  BlogDto,
  MediaDto,
  PublicArticleDto,
  PublicArticleSummaryDto,
  PublicBlogDto,
  RecentArticleDto,
  UserDto,
} from "@shared/types"

import type { Article, Blog, Media, User } from "../db/schema"
import type { ArticleSummary } from "../db/repositories/articlesRepository"
import type { BlogListItem } from "../db/repositories/blogsRepository"
import type { RecentArticle } from "../db/repositories/statsRepository"
import { mediaUrl } from "./media"
import { parseOrigins } from "./origins"

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
    coverImage: article.coverImage,
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
    bodyJson: article.bodyJson,
  }
}

export function toPublicArticleSummaryDto(article: ArticleSummary): PublicArticleSummaryDto {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    coverImage: article.coverImage,
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

export function toRecentArticleDto(article: RecentArticle): RecentArticleDto {
  return {
    ...toArticleSummaryDto(article),
    blogName: article.blogName,
    blogSlug: article.blogSlug,
  }
}

export function toMediaDto(item: Media, origin: string): MediaDto {
  return {
    id: item.id,
    blogId: item.blogId,
    filename: item.filename,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
    url: new URL(mediaUrl(item.blogId, item.filename), origin).toString(),
    createdAt: item.createdAt,
  }
}
