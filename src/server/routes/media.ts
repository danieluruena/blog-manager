import { Hono } from "hono"

import { isMediaFilename, isUuid, mediaKey } from "../lib/media"
import type { AppEnv } from "../types"

const mediaRoutes = new Hono<AppEnv>()

const notFound = () => new Response("No encontrado", { status: 404 })

function parseByteRange(header: string, size: number): { offset: number; length: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())

  if (!match) {
    return null
  }

  const startText = match[1]
  const endText = match[2]

  if (!startText && !endText) {
    return null
  }

  if (!startText) {
    const suffix = Number(endText)

    if (!Number.isInteger(suffix) || suffix <= 0) {
      return null
    }

    const length = Math.min(suffix, size)
    return { offset: size - length, length }
  }

  const offset = Number(startText)

  if (!Number.isInteger(offset) || offset >= size) {
    return null
  }

  const end = endText ? Number(endText) : size - 1

  if (!Number.isInteger(end) || end < offset) {
    return null
  }

  return {
    offset,
    length: Math.min(end, size - 1) - offset + 1,
  }
}

mediaRoutes.get("/:blogId/:filename", async (c) => {
  const blogId = c.req.param("blogId")
  const filename = c.req.param("filename")

  if (!isUuid(blogId) || !isMediaFilename(filename)) {
    return notFound()
  }

  let object: R2ObjectBody | null
  const rangeHeader = c.req.header("range")

  try {
    object = await c.env.MEDIA.get(
      mediaKey(blogId, filename),
      rangeHeader ? { range: c.req.raw.headers } : undefined,
    )
  } catch {
    return new Response("Rango no válido", {
      status: 416,
      headers: { "accept-ranges": "bytes" },
    })
  }

  if (!object) {
    return notFound()
  }

  const etag = object.httpEtag

  if (c.req.header("if-none-match") === etag) {
    return new Response(null, {
      status: 304,
      headers: { etag, "accept-ranges": "bytes" },
    })
  }

  const headers = new Headers()

  object.writeHttpMetadata(headers)
  headers.set("etag", etag)
  headers.set("cache-control", "public, max-age=31536000, immutable")
  headers.set("accept-ranges", "bytes")
  headers.set("content-disposition", `inline; filename="${filename}"`)
  headers.set("x-content-type-options", "nosniff")

  if (rangeHeader) {
    const range = parseByteRange(rangeHeader, object.size)

    if (!range) {
      return new Response(null, {
        status: 416,
        headers: {
          "accept-ranges": "bytes",
          "content-range": `bytes */${object.size}`,
        },
      })
    }

    headers.set(
      "content-range",
      `bytes ${range.offset}-${range.offset + range.length - 1}/${object.size}`,
    )
    headers.set("content-length", String(range.length))

    return new Response(object.body, { status: 206, headers })
  }

  headers.set("content-length", String(object.size))

  return new Response(object.body, { headers })
})

export { mediaRoutes }
