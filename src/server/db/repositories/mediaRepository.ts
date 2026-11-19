import { and, eq, inArray } from "drizzle-orm"

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

export async function findMediaByR2Keys(
  db: Database,
  blogId: string,
  keys: string[],
): Promise<Media[]> {
  if (keys.length === 0) {
    return []
  }

  return db
    .select()
    .from(media)
    .where(and(eq(media.blogId, blogId), inArray(media.r2Key, keys)))
}

export async function assignMediaToArticle(
  db: Database,
  articleId: string,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) {
    return
  }

  await db.update(media).set({ articleId }).where(inArray(media.id, ids))
}

export async function listMediaByArticle(
  db: Database,
  blogId: string,
  articleId: string,
): Promise<Media[]> {
  return db
    .select()
    .from(media)
    .where(and(eq(media.blogId, blogId), eq(media.articleId, articleId)))
}

export async function deleteMediaByIds(db: Database, ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return
  }

  await db.delete(media).where(inArray(media.id, ids))
}
