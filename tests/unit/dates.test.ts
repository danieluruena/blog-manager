import { describe, expect, it } from "vitest"

import { addDaysIso, normalizeIso, nowIso } from "../../src/server/lib/dates"

describe("dates", () => {
  it("genera fechas ISO válidas", () => {
    expect(Number.isNaN(Date.parse(nowIso()))).toBe(false)
  })

  it("normaliza una fecha a UTC", () => {
    expect(normalizeIso("2026-11-18T10:00:00+01:00")).toBe("2026-11-18T09:00:00.000Z")
    expect(normalizeIso(null)).toBeNull()
  })

  it("rechaza fechas inválidas", () => {
    expect(() => normalizeIso("no-es-una-fecha")).toThrow("Fecha inválida")
  })

  it("suma días en UTC", () => {
    expect(addDaysIso(7, new Date("2026-11-18T10:00:00.000Z"))).toBe("2026-11-25T10:00:00.000Z")
  })
})
