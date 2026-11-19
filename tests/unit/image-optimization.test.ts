import { describe, expect, it } from "vitest"

import { formatImageSize } from "../../src/client/lib/format"

describe("image optimization helpers", () => {
  it("formatea bytes, kilobytes y megabytes", () => {
    expect(formatImageSize(500)).toBe("500 B")
    expect(formatImageSize(2048)).toBe("2 KB")
    expect(formatImageSize(1024 * 1024)).toBe("1.0 MB")
    expect(formatImageSize(1.5 * 1024 * 1024)).toBe("1.5 MB")
  })
})
