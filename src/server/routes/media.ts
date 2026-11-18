import { Hono } from "hono"

import { isMediaFilename, isUuid, mediaKey } from "../lib/media"
import type { AppEnv } from "../types"

const mediaRoutes = new Hono<AppEnv>()

const notFound = () => new Response("No encontrado", { status: 404 })

mediaRoutes.get("/:blogId/:filename", async (c) => {
  const blogId = c.req.param("blogId")
  const filename = c.req.param("filename")

  if (!isUuid(blogId) || !isMediaFilename(filename)) {
    return notFound()
  }

  const object = await c.env.MEDIA.get(mediaKey(blogId, filename))

  if (!object) {
    return notFound()
  }

  const etag = object.httpEtag

  if (c.req.header("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { etag } })
  }

  const headers = new Headers()

  object.writeHttpMetadata(headers)
  headers.set("etag", etag)
  headers.set("cache-control", "public, max-age=31536000, immutable")
  headers.set("content-length", String(object.size))
  headers.set("content-disposition", `inline; filename="${filename}"`)
  headers.set("x-content-type-options", "nosniff")

  return new Response(object.body, { headers })
})

export { mediaRoutes }
