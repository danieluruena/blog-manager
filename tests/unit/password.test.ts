import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "../../src/server/lib/password";

describe("password", () => {
  it("genera un hash verificable y no guarda la contraseña en claro", async () => {
    const password = "Una-Clave-Segura-123";
    const hash = await hashPassword(password);

    expect(hash.startsWith("pbkdf2$600000$")).toBe(true);
    expect(hash).not.toContain(password);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
  });

  it("rechaza una contraseña incorrecta", async () => {
    const hash = await hashPassword("Una-Clave-Segura-123");

    await expect(verifyPassword("Otra-Clave-123", hash)).resolves.toBe(false);
  });

  it("rechaza hashes malformados", async () => {
    await expect(verifyPassword("cualquiera", "no-es-un-hash")).resolves.toBe(false);
    await expect(verifyPassword("cualquiera", "pbkdf2$1$00$00")).resolves.toBe(false);
  });
});
