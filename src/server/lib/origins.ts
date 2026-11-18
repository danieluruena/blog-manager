import type { Context } from "hono"

import type { Blog } from "../db/schema"
import type { AppEnv } from "../types"

export function parseOrigins(value: string): string[] {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      try {
        return new URL(origin).origin
      } catch {
        return null
      }
    })
    .filter((origin): origin is string => origin !== null)
}

export function getAllowedOrigins(blog: Blog): Set<string> {
  const origins = new Set<string>(parseOrigins(blog.allowedOrigins))

  try {
    origins.add(new URL(blog.siteUrl).origin)
  } catch {
    // La URL ya se valida al guardar el blog.
  }

  return origins
}

export function isOriginAllowed(blog: Blog, origin: string): boolean {
  return getAllowedOrigins(blog).has(origin)
}

export function applyPublicCors(c: Context<AppEnv>, blog: Blog): void {
  c.header("Vary", "Origin")

  const origin = c.req.header("Origin")

  if (!origin || !isOriginAllowed(blog, origin)) {
    return
  }

  c.header("Access-Control-Allow-Origin", origin)
  c.header("Access-Control-Allow-Methods", "GET, OPTIONS")
  c.header("Access-Control-Allow-Headers", "Content-Type")
  c.header("Access-Control-Max-Age", "86400")
}
