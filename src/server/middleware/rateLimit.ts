import type { MiddlewareHandler } from "hono"

import { ApiError } from "../lib/errors"
import type { AppEnv } from "../types"

type RateLimitBinding = "PUBLIC_RATE_LIMITER" | "MEDIA_RATE_LIMITER"

const WINDOW_SECONDS = 60

// Cloudflare fija CF-Connecting-IP en el borde; no usar X-Forwarded-For, que el cliente puede falsificar.
export function rateLimitByIp(binding: RateLimitBinding): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const ip = c.req.header("CF-Connecting-IP") ?? "unknown"
    const { success } = await c.env[binding].limit({ key: ip })

    if (!success) {
      throw new ApiError(429, "RATE_LIMITED", "Demasiadas peticiones. Inténtalo más tarde.", {
        retryAfterSeconds: WINDOW_SECONDS,
      })
    }

    await next()
  }
}
