import { beforeEach, describe, expect, it } from "vitest"

import {
  apiFetch,
  clearDatabase,
  createTestUser,
  getSessionCookie,
  jsonRequest,
  loginAs,
  TEST_PASSWORD,
} from "./helpers"

beforeEach(async () => {
  await clearDatabase()
})

describe("auth", () => {
  it("inicia sesión, devuelve el usuario actual y cierra sesión", async () => {
    const user = await createTestUser({ email: "admin@example.com", name: "Admin" })
    const { response, cookie } = await loginAs(user)

    expect(response.status).toBe(200)
    expect(cookie).not.toBeNull()
    expect(response.headers.get("set-cookie")).toContain("HttpOnly")
    expect(response.headers.get("set-cookie")).toContain("SameSite=Strict")

    const body = (await response.json()) as { data: { user: { email: string } } }
    expect(body.data.user.email).toBe("admin@example.com")

    const me = await apiFetch(
      jsonRequest("/api/auth/me", {
        cookie,
      }),
    )
    expect(me.status).toBe(200)

    const logout = await apiFetch(
      jsonRequest("/api/auth/logout", {
        method: "POST",
        cookie,
      }),
    )
    expect(logout.status).toBe(204)

    const meAfterLogout = await apiFetch(
      jsonRequest("/api/auth/me", {
        cookie,
      }),
    )
    expect(meAfterLogout.status).toBe(401)
  })

  it("rechaza credenciales inválidas y usuarios inactivos", async () => {
    const user = await createTestUser({ email: "user@example.com" })
    const inactive = await createTestUser({
      email: "inactive@example.com",
      isActive: false,
    })

    const wrongPassword = await loginAs(user, "Wrong-Password-123")
    expect(wrongPassword.response.status).toBe(401)

    const unknownUser = await apiFetch(
      jsonRequest("/api/auth/login", {
        method: "POST",
        body: { email: "nobody@example.com", password: TEST_PASSWORD },
      }),
    )
    expect(unknownUser.status).toBe(401)

    const inactiveLogin = await loginAs(inactive)
    expect(inactiveLogin.response.status).toBe(401)
    expect(inactiveLogin.cookie).toBeNull()
  })

  it("bloquea tras cinco intentos fallidos", async () => {
    const user = await createTestUser({ email: "rate-limit@example.com" })

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await loginAs(user, "Wrong-Password-123")
      expect(response.response.status).toBe(401)
    }

    const blocked = await loginAs(user, "Wrong-Password-123")

    expect(blocked.response.status).toBe(429)
    expect(blocked.response.headers.get("retry-after")).not.toBeNull()
  })

  it("cambia la contraseña y mantiene la sesión actual", async () => {
    const user = await createTestUser({ email: "change@example.com" })
    const { cookie } = await loginAs(user)
    const otherSession = await loginAs(user)
    const newPassword = "New-Password-456"

    const change = await apiFetch(
      jsonRequest("/api/auth/password", {
        method: "PATCH",
        cookie,
        body: {
          currentPassword: TEST_PASSWORD,
          newPassword,
        },
      }),
    )

    expect(change.status).toBe(204)

    const currentSession = await apiFetch(
      jsonRequest("/api/auth/me", {
        cookie,
      }),
    )
    expect(currentSession.status).toBe(200)

    const revokedSession = await apiFetch(
      jsonRequest("/api/auth/me", {
        cookie: otherSession.cookie,
      }),
    )
    expect(revokedSession.status).toBe(401)

    const oldLogin = await loginAs(user, TEST_PASSWORD)
    expect(oldLogin.response.status).toBe(401)

    const newLogin = await loginAs(user, newPassword)
    expect(newLogin.response.status).toBe(200)
    expect(newLogin.cookie).not.toBeNull()
  })

  it("rechaza mutaciones con un origen distinto", async () => {
    const user = await createTestUser({ email: "csrf@example.com" })

    const response = await apiFetch(
      jsonRequest("/api/auth/login", {
        method: "POST",
        origin: "https://evil.example",
        body: { email: user.email, password: TEST_PASSWORD },
      }),
    )

    expect(response.status).toBe(403)
  })

  it("permite mutaciones desde el mismo origen", async () => {
    const user = await createTestUser({ email: "same-origin@example.com" })

    const response = await apiFetch(
      jsonRequest("/api/auth/login", {
        method: "POST",
        origin: "http://example.com",
        body: { email: user.email, password: TEST_PASSWORD },
      }),
    )

    expect(response.status).toBe(200)
    expect(getSessionCookie(response)).not.toBeNull()
  })
})
