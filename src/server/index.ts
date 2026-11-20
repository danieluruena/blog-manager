import type { HealthResponse } from "@shared/types"
import { Hono } from "hono"

import { errorResponse } from "./lib/errors"
import { csrfProtection } from "./middleware/csrf"
import { rateLimitByIp } from "./middleware/rateLimit"
import { requestContext } from "./middleware/requestContext"
import { securityHeaders } from "./middleware/securityHeaders"
import { adminRoutes } from "./routes/admin"
import { authRoutes } from "./routes/auth"
import { mediaRoutes } from "./routes/media"
import { publicRoutes } from "./routes/public"
import type { AppEnv } from "./types"

const app = new Hono<AppEnv>()

app.use("*", requestContext)
app.use("*", securityHeaders)
app.use("/api/*", csrfProtection)
app.use("/api/public/v1/*", rateLimitByIp("PUBLIC_RATE_LIMITER"))
app.use("/media/*", rateLimitByIp("MEDIA_RATE_LIMITER"))

app.get("/api/health", (c) => {
  const response: HealthResponse = {
    ok: true,
    service: "blog-manager",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  }

  return c.json(response)
})

app.route("/api/auth", authRoutes)
app.route("/api/admin", adminRoutes)
app.route("/api/public/v1", publicRoutes)
app.route("/media", mediaRoutes)

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

app.onError((error, c) => errorResponse(c, error))

export default app
