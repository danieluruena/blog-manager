import { describe, expect, it } from "vitest"

import { fromDateTimeLocal, nowDateTimeLocal, toDateTimeLocal } from "../../src/client/lib/datetime"

describe("datetime", () => {
  it("convierte una fecha ISO a datetime-local y de vuelta sin perder información", () => {
    const iso = "2026-11-18T09:30:00.000Z"
    const local = toDateTimeLocal(iso)

    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(fromDateTimeLocal(local)).toBe(iso)
  })

  it("trata los valores vacíos como ausencia de fecha", () => {
    expect(toDateTimeLocal(null)).toBe("")
    expect(toDateTimeLocal(undefined)).toBe("")
    expect(fromDateTimeLocal("")).toBeNull()
  })

  it("ignora fechas inválidas", () => {
    expect(toDateTimeLocal("no-es-una-fecha")).toBe("")
    expect(fromDateTimeLocal("no-es-una-fecha")).toBeNull()
  })

  it("genera un valor datetime-local válido para ahora", () => {
    const value = nowDateTimeLocal()

    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(Number.isNaN(new Date(value).getTime())).toBe(false)
  })
})
