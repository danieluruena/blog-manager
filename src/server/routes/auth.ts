import { changePasswordSchema, loginSchema } from "@shared/schemas"
import { Hono } from "hono"
import type { Context } from "hono"

import { getDb } from "../db/client"
import { clearSessionCookie, getSessionToken, setSessionCookie } from "../lib/cookies"
import { toUserDto } from "../lib/dto"
import { parseJson } from "../lib/validate"
import { requireAuth } from "../middleware/auth"
import { changePassword, login, logout } from "../services/authService"
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
  const result = await login(getDb(c.env), input.email, input.password, clientIp(c))

  setSessionCookie(c, result.token)

  return c.json({
    data: {
      user: toUserDto(result.user),
      expiresAt: result.expiresAt,
    },
  })
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

authRoutes.patch("/password", requireAuth, async (c) => {
  const input = await parseJson(c, changePasswordSchema)

  await changePassword(getDb(c.env), c.get("user").id, input.currentPassword, input.newPassword)
  clearSessionCookie(c)

  return c.body(null, 204)
})

export { authRoutes }
