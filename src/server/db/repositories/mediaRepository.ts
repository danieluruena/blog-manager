import { and, eq } from "drizzle-orm"

import type { Database } from "../client"
import { media, type Media, type NewMedia } from "../schema"

export async function createMedia(db: Database, input: NewMedia): Promise<Media> {
  const [row] = await db.insert(media).values(input).returning()

  if (!row) {
    throw new Error("No se pudo guardar la imagen")
  }

  return row
}

export async function findMediaById(
  db: Database,
  blogId: string,
  id: string,
): Promise<Media | null> {
  const rows = await db
    .select()
    .from(media)
    .where(and(eq(media.blogId, blogId), eq(media.id, id)))
    .limit(1)

  return rows[0] ?? null
}

export async function listMediaKeysByBlog(db: Database, blogId: string): Promise<string[]> {
  const rows = await db.select({ r2Key: media.r2Key }).from(media).where(eq(media.blogId, blogId))

  return rows.map((row) => row.r2Key)
}

export async function deleteMediaById(db: Database, id: string): Promise<boolean> {
  const rows = await db.delete(media).where(eq(media.id, id)).returning({ id: media.id })

  return rows.length > 0
}
