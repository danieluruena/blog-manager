import type { MiddlewareHandler } from "hono"

import type { AppEnv } from "../types"

export const requestContext: MiddlewareHandler<AppEnv> = async (c, next) => {
  const requestId = crypto.randomUUID()
  c.set("requestId", requestId)
  c.header("X-Request-Id", requestId)
  c.header("X-Content-Type-Options", "nosniff")
  c.header("Referrer-Policy", "strict-origin-when-cross-origin")
  c.header("X-Frame-Options", "DENY")

  const startedAt = Date.now()
  await next()

  console.log(
    JSON.stringify({
      level: "info",
      requestId,
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      status: c.res.status,
      durationMs: Date.now() - startedAt,
    }),
  )
}
