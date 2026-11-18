import { eq, inArray } from "drizzle-orm"

import type { Database } from "../client"
import { authAttempts, type AuthAttempt, type NewAuthAttempt } from "../schema"

export async function getAuthAttempt(db: Database, key: string): Promise<AuthAttempt | null> {
  const rows = await db.select().from(authAttempts).where(eq(authAttempts.attemptKey, key)).limit(1)

  return rows[0] ?? null
}

export async function upsertAuthAttempt(db: Database, input: NewAuthAttempt): Promise<void> {
  await db
    .insert(authAttempts)
    .values(input)
    .onConflictDoUpdate({
      target: authAttempts.attemptKey,
      set: {
        attempts: input.attempts,
        windowStart: input.windowStart,
        blockedUntil: input.blockedUntil ?? null,
      },
    })
}

export async function deleteAuthAttempts(db: Database, keys: string[]): Promise<void> {
  if (keys.length === 0) {
    return
  }

  await db.delete(authAttempts).where(inArray(authAttempts.attemptKey, keys))
}
