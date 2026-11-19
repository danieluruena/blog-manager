import { beforeEach, describe, expect, it } from "vitest"

import { contentSecurityPolicy } from "../../src/server/middleware/securityHeaders"
import {
  apiFetch,
  clearDatabase,
  createTestBlog,
  createTestUser,
  jsonRequest,
  TEST_PASSWORD,
} from "./helpers"

beforeEach(async () => {
  await clearDatabase()
})

describe("security hardening", () => {
  it("añade cabeceras de seguridad a las respuestas", async () => {
    const response = await apiFetch(new Request("http://example.com/api/health"))

    expect(response.status).toBe(200)
    expect(response.headers.get("x-content-type-options")).toBe("nosniff")
    expect(response.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin")
    expect(response.headers.get("x-frame-options")).toBe("DENY")
    expect(response.headers.get("permissions-policy")).toContain("camera=()")
    expect(response.headers.get("strict-transport-security")).toBeNull()
  })

  it("añade HSTS cuando la petición es HTTPS", async () => {
    const response = await apiFetch(new Request("https://example.com/api/health"))

    expect(response.headers.get("strict-transport-security")).toBe(
      "max-age=31536000; includeSubDomains",
    )
  })

  it("genera una CSP estricta en producción y relajada en local", () => {
    const production = contentSecurityPolicy("blog-manager.example.workers.dev")
    const productionDirectives = production.split("; ")
    const productionScript = productionDirectives.find((directive) =>
      directive.startsWith("script-src"),
    )
    const productionConnect = productionDirectives.find((directive) =>
      directive.startsWith("connect-src"),
    )

    expect(productionScript).toBe("script-src 'self'")
    expect(productionConnect).toBe("connect-src 'self'")
    expect(production).toContain("upgrade-insecure-requests")
    expect(production).toContain("frame-ancestors 'none'")
    expect(production).toContain("object-src 'none'")
    expect(production).toContain("https://fonts.gstatic.com")

    const local = contentSecurityPolicy("localhost")
    const localDirectives = local.split("; ")
    const localScript = localDirectives.find((directive) => directive.startsWith("script-src"))
    const localConnect = localDirectives.find((directive) => directive.startsWith("connect-src"))

    expect(localScript).toBe("script-src 'self' 'unsafe-inline'")
    expect(localConnect).toContain("ws:")
    expect(local).not.toContain("upgrade-insecure-requests")
  })

  it("marca la cookie de sesión como Secure en HTTPS", async () => {
    const user = await createTestUser({ email: "secure@example.com" })
    const response = await apiFetch(
      new Request("https://example.com/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://example.com",
        },
        body: JSON.stringify({ email: user.email, password: TEST_PASSWORD }),
      }),
    )

    const setCookie = response.headers.get("set-cookie") ?? ""

    expect(response.status).toBe(200)
    expect(setCookie).toContain("Secure")
    expect(setCookie).toContain("HttpOnly")
    expect(setCookie).toContain("SameSite=Strict")
    expect(setCookie).toContain("Path=/")
  })

  it("aplica CORS solo a los orígenes permitidos y varía por Origin", async () => {
    const blog = await createTestBlog({
      siteUrl: "https://pagina.example",
      allowedOrigins: "https://www.pagina.example",
    })
    const path = `/api/public/v1/blogs/${blog.slug}/articles`

    const allowed = await apiFetch(
      new Request(`http://example.com${path}`, {
        headers: { origin: "https://pagina.example" },
      }),
    )

    expect(allowed.status).toBe(200)
    expect(allowed.headers.get("access-control-allow-origin")).toBe("https://pagina.example")
    expect(allowed.headers.get("vary")).toContain("Origin")
    expect(allowed.headers.get("access-control-allow-credentials")).toBeNull()

    const extra = await apiFetch(
      new Request(`http://example.com${path}`, {
        headers: { origin: "https://www.pagina.example" },
      }),
    )

    expect(extra.headers.get("access-control-allow-origin")).toBe("https://www.pagina.example")

    const denied = await apiFetch(
      new Request(`http://example.com${path}`, {
        headers: { origin: "https://evil.example" },
      }),
    )

    expect(denied.status).toBe(200)
    expect(denied.headers.get("access-control-allow-origin")).toBeNull()
    expect(denied.headers.get("vary")).toContain("Origin")
  })

  it("responde al preflight CORS del blog", async () => {
    const blog = await createTestBlog({ siteUrl: "https://pagina.example" })

    const response = await apiFetch(
      new Request(`http://example.com/api/public/v1/blogs/${blog.slug}/articles`, {
        method: "OPTIONS",
        headers: {
          origin: "https://pagina.example",
          "access-control-request-method": "GET",
        },
      }),
    )

    expect(response.status).toBe(204)
    expect(response.headers.get("access-control-allow-origin")).toBe("https://pagina.example")
    expect(response.headers.get("access-control-allow-methods")).toContain("GET")
    expect(response.headers.get("access-control-allow-headers")).toContain("Content-Type")
  })

  it("protege todas las rutas de administración con autenticación", async () => {
    const requests = [
      jsonRequest("/api/admin/stats"),
      jsonRequest("/api/admin/blogs"),
      jsonRequest("/api/admin/blogs/blog-id"),
      jsonRequest("/api/admin/blogs/blog-id/articles"),
      jsonRequest("/api/admin/blogs/blog-id/articles/article-id"),
      jsonRequest("/api/admin/blogs/blog-id/media", {
        method: "POST",
        body: {},
      }),
      jsonRequest("/api/admin/blogs/blog-id", {
        method: "DELETE",
      }),
    ]

    for (const request of requests) {
      const response = await apiFetch(request)
      expect(response.status).toBe(401)
    }
  })
})
