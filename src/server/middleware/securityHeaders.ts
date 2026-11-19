import type { MiddlewareHandler } from "hono"

import type { AppEnv } from "../types"

function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  )
}

export function contentSecurityPolicy(hostname: string): string {
  const local = isLocalHost(hostname)
  const directives = [
    "default-src 'self'",
    local ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    local ? "connect-src 'self' ws: wss: http: https:" : "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ]

  if (!local) {
    directives.push("upgrade-insecure-requests")
  }

  return directives.join("; ")
}

export const securityHeaders: MiddlewareHandler<AppEnv> = async (c, next) => {
  const url = new URL(c.req.url)

  c.header("X-Content-Type-Options", "nosniff")
  c.header("Referrer-Policy", "strict-origin-when-cross-origin")
  c.header("X-Frame-Options", "DENY")
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), browsing-topics=()")

  if (url.protocol === "https:") {
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  }

  if (!url.pathname.startsWith("/api/") && !url.pathname.startsWith("/media/")) {
    c.header("Content-Security-Policy", contentSecurityPolicy(url.hostname))
  }

  // Fuerza a Hono a materializar la respuesta para que las cabeceras se
  // fusionen también cuando el handler devuelve un Response crudo (ASSETS).
  void c.res

  await next()
}
