import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from "@shared/schemas"
import { Hono } from "hono"
import type { Context } from "hono"

import { getDb } from "../db/client"
import { sha256Hex } from "../lib/encoding"
import { clearSessionCookie, getSessionToken, setSessionCookie } from "../lib/cookies"
import { toUserDto } from "../lib/dto"
import { ApiError } from "../lib/errors"
import { checkRateLimit, registerFailedAttempt } from "../lib/rateLimit"
import { parseJson } from "../lib/validate"
import { requireAuth } from "../middleware/auth"
import { changePassword, login, logout } from "../services/authService"
import { registerUser, updateProfile } from "../services/userService"
import type { AppEnv } from "../types"

const authRoutes = new Hono<AppEnv>()

function clientIp(c: Context<AppEnv>): string {
  return (
    c.req.header("CF-Connecting-IP") ??
    c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "unknown"
  )
}

authRoutes.post("/login", async (c) => {
  const input = await parseJson(c, loginSchema)
  const result = await login(
    getDb(c.env),
    input.email,
    input.password,
    clientIp(c),
    c.env.AUTH_PEPPER,
  )

  setSessionCookie(c, result.token)

  return c.json({
    data: {
      user: toUserDto(result.user),
      expiresAt: result.expiresAt,
    },
  })
})

authRoutes.post("/register", async (c) => {
  const input = await parseJson(c, registerSchema)
  const db = getDb(c.env)
  const keys = [await sha256Hex(`register:${clientIp(c)}`)]
  const rateLimit = await checkRateLimit(db, keys)

  if (rateLimit.blocked) {
    throw new ApiError(
      429,
      "RATE_LIMITED",
      "Demasiados registros desde esta conexión. Inténtalo más tarde.",
      { retryAfterSeconds: rateLimit.retryAfterSeconds },
    )
  }

  await registerFailedAttempt(db, keys)
  const user = await registerUser(db, input, c.env.AUTH_PEPPER)

  return c.json(
    {
      data: {
        user: toUserDto(user),
        message: "Cuenta creada. Un administrador debe aprobarla antes de iniciar sesión.",
      },
    },
    201,
  )
})

authRoutes.post("/logout", async (c) => {
  await logout(getDb(c.env), getSessionToken(c))
  clearSessionCookie(c)

  return c.body(null, 204)
})

authRoutes.get("/me", requireAuth, (c) => {
  return c.json({
    data: {
      user: toUserDto(c.get("user")),
    },
  })
})

authRoutes.patch("/profile", requireAuth, async (c) => {
  const input = await parseJson(c, updateProfileSchema)
  const user = await updateProfile(getDb(c.env), c.get("user").id, input.name)

  return c.json({ data: { user } })
})

authRoutes.patch("/password", requireAuth, async (c) => {
  const input = await parseJson(c, changePasswordSchema)

  await changePassword(
    getDb(c.env),
    c.get("user").id,
    input.currentPassword,
    input.newPassword,
    c.env.AUTH_PEPPER,
    c.get("session").id,
  )

  return c.body(null, 204)
})

export { authRoutes }
