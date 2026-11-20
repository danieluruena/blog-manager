import { env, exports } from "cloudflare:workers"

import { createDb } from "../../src/server/db/client"
import { createArticle } from "../../src/server/db/repositories/articlesRepository"
import { replaceUserPermissions } from "../../src/server/db/repositories/blogPermissionsRepository"
import { createBlog } from "../../src/server/db/repositories/blogsRepository"
import { createUser } from "../../src/server/db/repositories/usersRepository"
import type {
  Article,
  Blog,
  BlogPermission,
  NewArticle,
  NewBlog,
  User,
} from "../../src/server/db/schema"
import { hashPassword } from "../../src/server/lib/password"

export const TEST_PASSWORD = "Test-Password-123"
export const TEST_PEPPER = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
export const NOW = "2026-11-18T10:00:00.000Z"

const db = createDb(env.DB)
let passwordHashPromise: Promise<string> | null = null

function getTestPasswordHash(): Promise<string> {
  passwordHashPromise ??= hashPassword(TEST_PASSWORD, TEST_PEPPER)
  return passwordHashPromise
}

export async function clearDatabase(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions"),
    env.DB.prepare("DELETE FROM articles"),
    env.DB.prepare("DELETE FROM media"),
    env.DB.prepare("DELETE FROM blog_permissions"),
    env.DB.prepare("DELETE FROM blogs"),
    env.DB.prepare("DELETE FROM users"),
    env.DB.prepare("DELETE FROM auth_attempts"),
  ])
}

type TestUserOptions = {
  email?: string
  name?: string
  password?: string
  role?: User["role"]
  isActive?: boolean
  isApproved?: boolean
}

export async function createTestUser(options: TestUserOptions = {}): Promise<User> {
  const id = crypto.randomUUID()
  const passwordHash = options.password
    ? await hashPassword(options.password, TEST_PEPPER)
    : await getTestPasswordHash()

  return createUser(db, {
    id,
    email: options.email ?? `user-${id.slice(0, 8)}@example.com`,
    name: options.name ?? "Usuario de prueba",
    passwordHash,
    role: options.role ?? "admin",
    isActive: options.isActive ?? true,
    isApproved: options.isApproved ?? true,
    createdAt: NOW,
    updatedAt: NOW,
  })
}

export async function createTestBlog(overrides: Partial<NewBlog> = {}): Promise<Blog> {
  const id = crypto.randomUUID()

  return createBlog(db, {
    id,
    name: "Blog de prueba",
    slug: `blog-${id.slice(0, 8)}`,
    description: "Descripción de prueba",
    siteUrl: "https://example.com",
    allowedOrigins: "",
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  })
}

export async function createTestArticle(
  blogId: string,
  overrides: Partial<NewArticle> = {},
): Promise<Article> {
  const id = crypto.randomUUID()

  return createArticle(db, {
    id,
    blogId,
    title: "Artículo de prueba",
    slug: `articulo-${id.slice(0, 8)}`,
    excerpt: "Resumen de prueba",
    author: "Autor de prueba",
    body: "<p>Cuerpo del artículo</p>",
    bodyJson: richTextJson("Cuerpo del artículo"),
    status: "draft",
    publishedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  })
}

export function richTextJson(text = ""): string {
  return JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: text ? [{ type: "text", text }] : [],
      },
    ],
  })
}

export function richTextImageJson(src: string, alt = "Imagen"): string {
  return JSON.stringify({
    type: "doc",
    content: [{ type: "image", attrs: { src, alt } }],
  })
}

export function richTextVideoJson(src: string, title = "Vídeo"): string {
  return JSON.stringify({
    type: "doc",
    content: [{ type: "video", attrs: { src, title } }],
  })
}

export async function grantBlogPermission(
  userId: string,
  blogId: string,
  permission: BlogPermission = "write",
): Promise<void> {
  await replaceUserPermissions(db, userId, [{ blogId, permission }], NOW)
}

export function apiFetch(request: Request): Promise<Response> {
  return exports.default.fetch(request)
}

type JsonRequestOptions = {
  method?: string
  body?: unknown
  cookie?: string | null
  origin?: string
  headers?: Record<string, string>
}

export function jsonRequest(path: string, options: JsonRequestOptions = {}): Request {
  const headers = new Headers(options.headers)

  if (options.body !== undefined) {
    headers.set("content-type", "application/json")
  }

  if (options.cookie) {
    headers.set("cookie", options.cookie)
  }

  if (options.origin) {
    headers.set("origin", options.origin)
  }

  return new Request(`http://example.com${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
}

export function getSessionCookie(response: Response): string | null {
  const setCookie = response.headers.get("set-cookie")

  if (!setCookie) {
    return null
  }

  return setCookie.split(";")[0] ?? null
}

export async function loginAs(
  user: User,
  password = TEST_PASSWORD,
): Promise<{ response: Response; cookie: string | null }> {
  const response = await apiFetch(
    jsonRequest("/api/auth/login", {
      method: "POST",
      body: { email: user.email, password },
    }),
  )

  return {
    response,
    cookie: getSessionCookie(response),
  }
}
