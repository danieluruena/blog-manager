import type { MiddlewareHandler } from "hono"

import type { AppEnv } from "../types"

export const requestContext: MiddlewareHandler<AppEnv> = async (c, next) => {
  const requestId = crypto.randomUUID()
  c.set("requestId", requestId)
  c.header("X-Request-Id", requestId)

  const startedAt = Date.now()
  await next()

  const status = c.res.status
  const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info"

  console.log(
    JSON.stringify({
      level,
      requestId,
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      status,
      durationMs: Date.now() - startedAt,
      rayId: c.req.header("CF-Ray"),
    }),
  )
}
