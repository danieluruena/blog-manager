import { describe, expect, it } from "vitest"

import {
  GOOGLE_FONTS,
  SYSTEM_FONTS,
  findFont,
  primaryFontFamily,
} from "../../src/client/lib/editor-options"

describe("font catalog", () => {
  it("incluye al menos 100 Google Fonts con nombres únicos", () => {
    expect(GOOGLE_FONTS.length).toBeGreaterThanOrEqual(100)

    const names = new Set(GOOGLE_FONTS.map((font) => font.name.toLowerCase()))

    expect(names.size).toBe(GOOGLE_FONTS.length)
  })

  it("genera familias con la fuente principal y un fallback", () => {
    for (const font of [...GOOGLE_FONTS, ...SYSTEM_FONTS]) {
      expect(font.family).toContain(",")

      if (font.name !== "Sistema") {
        expect(primaryFontFamily(font.family)).toBe(font.name.toLowerCase())
      }
    }
  })

  it("resuelve familias con comillas, espacios y fallbacks", () => {
    expect(findFont("Lora, Georgia, serif")?.name).toBe("Lora")
    expect(findFont("'Playfair Display', Georgia, serif")?.name).toBe("Playfair Display")
    expect(findFont('"Playfair Display", Georgia, serif')?.name).toBe("Playfair Display")
    expect(findFont("Arial, sans-serif")?.name).toBe("Arial")
    expect(findFont("system-ui, sans-serif")?.name).toBe("Sistema")
    expect(findFont("default")).toBeUndefined()
    expect(findFont("Familia inexistente, serif")).toBeUndefined()
  })

  it("todas las fuentes de Google declaran el peso 400", () => {
    for (const font of GOOGLE_FONTS) {
      expect(font.weights ?? [400, 700]).toContain(400)
    }
  })
})
