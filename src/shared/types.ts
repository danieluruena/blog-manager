import type { ArticleStatus, UserRole } from "./constants"

export type HealthResponse = {
  ok: true
  service: "blog-manager"
  version: string
  timestamp: string
}

export type ApiErrorResponse = {
  error: {
    code: string
    message: string
    details?: unknown
    requestId?: string
  }
}

export type DataResponse<T> = {
  data: T
}

export type PaginatedMeta = {
  page: number
  pageSize: number
  total: number
}

export type PaginatedResponse<T> = {
  data: T[]
  meta: PaginatedMeta
}

export type UserDto = {
  id: string
  email: string
  name: string
  role: UserRole
}

export type LoginResponse = DataResponse<{
  user: UserDto
  expiresAt: string
}>

export type MeResponse = DataResponse<{
  user: UserDto
}>

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
  status: ArticleStatus
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

export type MediaDto = {
  id: string
  blogId: string
  filename: string
  mimeType: string
  sizeBytes: number
  url: string
  createdAt: string
}

export type DashboardStats = {
  totalBlogs: number
  activeBlogs: number
  totalArticles: number
  publishedArticles: number
  draftArticles: number
  featuredArticles: number
}

export type RecentArticleDto = ArticleSummaryDto & {
  blogName: string
  blogSlug: string
}

export type StatsDto = DashboardStats & {
  recentArticles: RecentArticleDto[]
}
