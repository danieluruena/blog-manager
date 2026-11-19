import type { MiddlewareHandler } from "hono"

import { getDb } from "../db/client"
import { getSessionToken } from "../lib/cookies"
import { nowIso } from "../lib/dates"
import { ApiError } from "../lib/errors"
import { hashSessionToken } from "../lib/session"
import type { AppEnv } from "../types"
import { findValidSessionByTokenHash } from "../db/repositories/sessionsRepository"

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getSessionToken(c)

  if (!token) {
    throw new ApiError(401, "UNAUTHORIZED", "No autenticado")
  }

  const db = getDb(c.env)
  const session = await findValidSessionByTokenHash(db, await hashSessionToken(token), nowIso())

  if (!session) {
    throw new ApiError(401, "UNAUTHORIZED", "Sesión inválida o expirada")
  }

  c.set("user", session.user)
  c.set("session", session.session)

  await next()
}

export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.get("user").role !== "admin") {
    throw new ApiError(403, "FORBIDDEN", "Se requiere rol de administrador")
  }

  await next()
}
