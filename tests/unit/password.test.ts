import { describe, expect, it } from "vitest"

import { hashPassword, verifyPassword } from "../../src/server/lib/password"

const PEPPER = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

describe("password", () => {
  it("genera un hash verificable y no guarda la contraseña en claro", async () => {
    const password = "Una-Clave-Segura-123"
    const hash = await hashPassword(password, PEPPER)

    expect(hash.startsWith("hmac-sha256$1$")).toBe(true)
    expect(hash).not.toContain(password)
    await expect(verifyPassword(password, hash, PEPPER)).resolves.toBe(true)
  })

  it("rechaza una contraseña incorrecta", async () => {
    const hash = await hashPassword("Una-Clave-Segura-123", PEPPER)

    await expect(verifyPassword("Otra-Clave-123", hash, PEPPER)).resolves.toBe(false)
  })

  it("rechaza un pepper distinto", async () => {
    const hash = await hashPassword("Una-Clave-Segura-123", PEPPER)

    await expect(
      verifyPassword(
        "Una-Clave-Segura-123",
        hash,
        "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      ),
    ).resolves.toBe(false)
  })

  it("rechaza hashes malformados y peppers cortos", async () => {
    await expect(verifyPassword("cualquiera", "no-es-un-hash", PEPPER)).resolves.toBe(false)
    await expect(verifyPassword("cualquiera", "hmac-sha256$1$00$00", PEPPER)).resolves.toBe(false)
    await expect(verifyPassword("cualquiera", "no-es-un-hash", "corto")).resolves.toBe(false)
    await expect(hashPassword("cualquiera", "corto")).rejects.toThrow("AUTH_PEPPER")
  })
})
