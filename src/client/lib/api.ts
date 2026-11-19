import type {
  ArticleCreateInput,
  ArticleUpdateInput,
  BlogCreateInput,
  BlogUpdateInput,
  ChangePasswordInput,
  LoginInput,
} from "@shared/schemas"
import type { ArticleStatus } from "@shared/constants"
import type {
  ApiErrorResponse,
  ArticleDto,
  ArticleSummaryDto,
  BlogDto,
  DataResponse,
  LoginResponse,
  MediaDto,
  MeResponse,
  PaginatedResponse,
  StatsDto,
} from "@shared/types"

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
    public requestId?: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)

  if (typeof init.body === "string" && !headers.has("content-type")) {
    headers.set("content-type", "application/json")
  }

  const response = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get("content-type") ?? ""
  const payload = contentType.includes("application/json")
    ? ((await response.json()) as unknown)
    : null

  if (!response.ok) {
    const apiError = payload as ApiErrorResponse | null
    const error = apiError?.error

    throw new ApiError(
      response.status,
      error?.code ?? "HTTP_ERROR",
      error?.message ?? `Error HTTP ${response.status}`,
      error?.details,
      error?.requestId,
    )
  }

  return payload as T
}

function withQuery(
  path: string,
  params: Record<string, string | number | boolean | undefined | null> = {},
): string {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value))
    }
  }

  const query = search.toString()
  return query ? `${path}?${query}` : path
}

export type ListBlogsParams = {
  q?: string
  active?: boolean
  page?: number
  pageSize?: number
  sort?: "name" | "updated_at" | "created_at"
}

export type ListArticlesParams = {
  q?: string
  status?: ArticleStatus
  page?: number
  pageSize?: number
  sort?: "updated_at" | "published_at" | "created_at" | "title"
}

export const api = {
  login(input: LoginInput): Promise<LoginResponse> {
    return request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    })
  },

  logout(): Promise<void> {
    return request<void>("/api/auth/logout", { method: "POST" })
  },

  me(): Promise<MeResponse> {
    return request<MeResponse>("/api/auth/me")
  },

  changePassword(input: ChangePasswordInput): Promise<void> {
    return request<void>("/api/auth/password", {
      method: "PATCH",
      body: JSON.stringify(input),
    })
  },

  getStats(): Promise<DataResponse<StatsDto>> {
    return request<DataResponse<StatsDto>>("/api/admin/stats")
  },

  listBlogs(params: ListBlogsParams = {}): Promise<PaginatedResponse<BlogDto>> {
    return request<PaginatedResponse<BlogDto>>(withQuery("/api/admin/blogs", params))
  },

  getBlog(blogId: string): Promise<DataResponse<BlogDto>> {
    return request<DataResponse<BlogDto>>(`/api/admin/blogs/${blogId}`)
  },

  createBlog(input: BlogCreateInput): Promise<DataResponse<BlogDto>> {
    return request<DataResponse<BlogDto>>("/api/admin/blogs", {
      method: "POST",
      body: JSON.stringify(input),
    })
  },

  updateBlog(blogId: string, input: BlogUpdateInput): Promise<DataResponse<BlogDto>> {
    return request<DataResponse<BlogDto>>(`/api/admin/blogs/${blogId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    })
  },

  deleteBlog(blogId: string): Promise<void> {
    return request<void>(`/api/admin/blogs/${blogId}`, { method: "DELETE" })
  },

  listArticles(
    blogId: string,
    params: ListArticlesParams = {},
  ): Promise<PaginatedResponse<ArticleSummaryDto>> {
    return request<PaginatedResponse<ArticleSummaryDto>>(
      withQuery(`/api/admin/blogs/${blogId}/articles`, params),
    )
  },

  getArticle(blogId: string, articleId: string): Promise<DataResponse<ArticleDto>> {
    return request<DataResponse<ArticleDto>>(`/api/admin/blogs/${blogId}/articles/${articleId}`)
  },

  createArticle(blogId: string, input: ArticleCreateInput): Promise<DataResponse<ArticleDto>> {
    return request<DataResponse<ArticleDto>>(`/api/admin/blogs/${blogId}/articles`, {
      method: "POST",
      body: JSON.stringify(input),
    })
  },

  updateArticle(
    blogId: string,
    articleId: string,
    input: ArticleUpdateInput,
  ): Promise<DataResponse<ArticleDto>> {
    return request<DataResponse<ArticleDto>>(`/api/admin/blogs/${blogId}/articles/${articleId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    })
  },

  deleteArticle(blogId: string, articleId: string): Promise<void> {
    return request<void>(`/api/admin/blogs/${blogId}/articles/${articleId}`, {
      method: "DELETE",
    })
  },

  uploadImage(blogId: string, file: File): Promise<DataResponse<MediaDto>> {
    const body = new FormData()
    body.set("file", file)

    return request<DataResponse<MediaDto>>(`/api/admin/blogs/${blogId}/media`, {
      method: "POST",
      body,
    })
  },
}
