import type { MiddlewareHandler } from "hono"

import { ApiError } from "../lib/errors"
import type { AppEnv } from "../types"

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

export const csrfProtection: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (SAFE_METHODS.has(c.req.method)) {
    await next()
    return
  }

  const origin = c.req.header("Origin")

  if (!origin) {
    await next()
    return
  }

  let originUrl: URL

  try {
    originUrl = new URL(origin)
  } catch {
    throw new ApiError(403, "FORBIDDEN", "Origen no permitido")
  }

  if (originUrl.origin !== new URL(c.req.url).origin) {
    throw new ApiError(403, "FORBIDDEN", "Origen no permitido")
  }

  await next()
}
