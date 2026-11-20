import { and, eq, gt, lt, ne } from "drizzle-orm"

import type { Database } from "../client"
import { sessions, users, type NewSession, type Session, type User } from "../schema"

export type SessionWithUser = {
  session: Session
  user: User
}

export async function createSession(db: Database, input: NewSession): Promise<Session> {
  const [session] = await db.insert(sessions).values(input).returning()

  if (!session) {
    throw new Error("No se pudo crear la sesión")
  }

  return session
}

export async function findValidSessionByTokenHash(
  db: Database,
  tokenHash: string,
  now: string,
): Promise<SessionWithUser | null> {
  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, now),
        eq(users.isActive, true),
        eq(users.isApproved, true),
      ),
    )
    .limit(1)

  return rows[0] ?? null
}

export async function deleteSessionByTokenHash(db: Database, tokenHash: string): Promise<boolean> {
  const rows = await db
    .delete(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .returning({ id: sessions.id })

  return rows.length > 0
}

export async function deleteSessionsByUserId(
  db: Database,
  userId: string,
  exceptSessionId?: string,
): Promise<number> {
  const rows = await db
    .delete(sessions)
    .where(
      exceptSessionId
        ? and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId))
        : eq(sessions.userId, userId),
    )
    .returning({ id: sessions.id })

  return rows.length
}

export async function deleteExpiredSessions(db: Database, now: string): Promise<number> {
  const rows = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, now))
    .returning({ id: sessions.id })

  return rows.length
}
