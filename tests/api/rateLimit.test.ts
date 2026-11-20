import { beforeEach, describe, expect, it } from "vitest"

import { apiFetch, clearDatabase, createTestBlog } from "./helpers"

beforeEach(async () => {
  await clearDatabase()
})

function requestFrom(ip: string, path: string): Request {
  return new Request(`http://example.com${path}`, {
    headers: { "CF-Connecting-IP": ip },
  })
}

describe("rate limiting por IP", () => {
  it("limita la API pública por IP y responde 429 con Retry-After", async () => {
    const blog = await createTestBlog({ slug: "rate-limit-publico" })
    const path = `/api/public/v1/blogs/${blog.slug}`
    const ip = "198.51.100.10"

    const statuses: number[] = []
    for (let index = 0; index < 150; index += 1) {
      const response = await apiFetch(requestFrom(ip, path))
      statuses.push(response.status)
    }

    expect(statuses[0]).toBe(200)
    expect(statuses).toContain(429)

    const limited = await apiFetch(requestFrom(ip, path))
    expect(limited.status).toBe(429)
    expect(limited.headers.get("retry-after")).toBe("60")
    expect(((await limited.json()) as { error: { code: string } }).error.code).toBe("RATE_LIMITED")
  })

  it("no afecta a otra IP cuando una ya está limitada", async () => {
    const blog = await createTestBlog({ slug: "rate-limit-aislado" })
    const path = `/api/public/v1/blogs/${blog.slug}`

    for (let index = 0; index < 150; index += 1) {
      await apiFetch(requestFrom("198.51.100.20", path))
    }

    const other = await apiFetch(requestFrom("198.51.100.21", path))
    expect(other.status).toBe(200)
  })

  it("protege también los medios", async () => {
    const statuses: number[] = []
    for (let index = 0; index < 320; index += 1) {
      const response = await apiFetch(
        requestFrom("198.51.100.30", "/media/00000000-0000-4000-8000-000000000000/x.webp"),
      )
      statuses.push(response.status)
    }

    expect(statuses).toContain(429)
    expect(statuses).not.toContain(200)
  })
})
