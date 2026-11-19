import { describe, expect, it } from "vitest"

import { decodeCursor, encodeCursor } from "../../src/server/lib/cursor"

describe("cursor", () => {
  it("codifica y decodifica un cursor", () => {
    const cursor = {
      publishedAt: "2026-11-18T10:00:00.000Z",
      id: "a0000001-0000-4000-8000-000000000001",
    }

    const encoded = encodeCursor(cursor)

    expect(decodeCursor(encoded)).toEqual(cursor)
  })

  it("devuelve null para un cursor inválido", () => {
    expect(decodeCursor("no-es-un-cursor")).toBeNull()
    expect(decodeCursor("")).toBeNull()
  })
})
