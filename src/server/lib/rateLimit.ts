import type { Database } from "../db/client"
import {
  deleteAuthAttempts,
  getAuthAttempt,
  upsertAuthAttempt,
} from "../db/repositories/authAttemptsRepository"
import { sha256Hex } from "./encoding"

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000
const BLOCK_MS = 15 * 60 * 1000

export type RateLimitResult = {
  blocked: boolean
  retryAfterSeconds: number
}

export async function buildAttemptKeys(ip: string, email: string): Promise<string[]> {
  return [await sha256Hex(`ip:${ip}`), await sha256Hex(`email:${email.trim().toLowerCase()}`)]
}

export async function checkRateLimit(
  db: Database,
  keys: string[],
  nowMs = Date.now(),
): Promise<RateLimitResult> {
  let retryAfterSeconds = 0

  for (const key of keys) {
    const attempt = await getAuthAttempt(db, key)

    if (attempt?.blockedUntil && attempt.blockedUntil > nowMs) {
      retryAfterSeconds = Math.max(
        retryAfterSeconds,
        Math.ceil((attempt.blockedUntil - nowMs) / 1000),
      )
    }
  }

  return {
    blocked: retryAfterSeconds > 0,
    retryAfterSeconds,
  }
}

export async function registerFailedAttempt(
  db: Database,
  keys: string[],
  nowMs = Date.now(),
): Promise<void> {
  for (const key of keys) {
    const existing = await getAuthAttempt(db, key)

    if (!existing || existing.windowStart + WINDOW_MS <= nowMs) {
      await upsertAuthAttempt(db, {
        attemptKey: key,
        attempts: 1,
        windowStart: nowMs,
        blockedUntil: null,
      })
      continue
    }

    const attempts = existing.attempts + 1
    const blockedUntil = attempts >= MAX_ATTEMPTS ? nowMs + BLOCK_MS : null

    await upsertAuthAttempt(db, {
      attemptKey: key,
      attempts,
      windowStart: existing.windowStart,
      blockedUntil,
    })
  }
}

export async function clearFailedAttempts(db: Database, keys: string[]): Promise<void> {
  await deleteAuthAttempts(db, keys)
}
