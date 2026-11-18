import { Hono } from "hono"

import type { HealthResponse } from "@shared/types"

type AppEnv = {
  Bindings: Env
  Variables: {
    requestId: string
  }
}

const app = new Hono<AppEnv>()

app.use("*", async (c, next) => {
  const requestId = crypto.randomUUID()
  c.set("requestId", requestId)
  c.header("X-Request-Id", requestId)

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
})

app.get("/api/health", (c) => {
  const response: HealthResponse = {
    ok: true,
    service: "blog-manager",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  }

  return c.json(response)
})

app.notFound((c) => {
  const { pathname } = new URL(c.req.url)

  if (pathname.startsWith("/api/") || pathname.startsWith("/media/")) {
    return c.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Recurso no encontrado",
          requestId: c.get("requestId"),
        },
      },
      404,
    )
  }

  return c.env.ASSETS.fetch(c.req.raw)
})

app.onError((error, c) => {
  console.error(
    JSON.stringify({
      level: "error",
      requestId: c.get("requestId"),
      message: error instanceof Error ? error.message : "Error desconocido",
    }),
  )

  return c.json(
    {
      error: {
        code: "INTERNAL",
        message: "Error interno del servidor",
        requestId: c.get("requestId"),
      },
    },
    500,
  )
})

export default app
