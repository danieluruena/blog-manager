import type { Database } from "../db/client"
import type { User } from "../db/schema"
import {
  createSession,
  deleteExpiredSessions,
  deleteSessionByTokenHash,
  deleteSessionsByUserId,
  findValidSessionByTokenHash,
} from "../db/repositories/sessionsRepository"
import { findUserByEmail, findUserById, updateUser } from "../db/repositories/usersRepository"
import { addDaysIso, nowIso } from "../lib/dates"
import { ApiError } from "../lib/errors"
import { newId } from "../lib/ids"
import { hashPassword, verifyPassword } from "../lib/password"
import {
  buildAttemptKeys,
  checkRateLimit,
  clearFailedAttempts,
  registerFailedAttempt,
} from "../lib/rateLimit"
import { generateSessionToken, hashSessionToken } from "../lib/session"

const SESSION_DAYS = 7

function assertPepper(pepper: string): void {
  if (!pepper || pepper.length < 32) {
    throw new ApiError(
      500,
      "CONFIGURATION_ERROR",
      "Falta configurar AUTH_PEPPER (mínimo 32 caracteres)",
    )
  }
}

export type LoginResult = {
  user: User
  token: string
  expiresAt: string
}

export async function login(
  db: Database,
  email: string,
  password: string,
  ip: string,
  pepper: string,
): Promise<LoginResult> {
  assertPepper(pepper)

  const keys = await buildAttemptKeys(ip, email)
  const rateLimit = await checkRateLimit(db, keys)

  if (rateLimit.blocked) {
    throw new ApiError(
      429,
      "RATE_LIMITED",
      "Demasiados intentos de inicio de sesión. Inténtalo más tarde.",
      { retryAfterSeconds: rateLimit.retryAfterSeconds },
    )
  }

  const user = await findUserByEmail(db, email)

  if (!user || !user.isActive) {
    await registerFailedAttempt(db, keys)
    throw new ApiError(401, "INVALID_CREDENTIALS", "Credenciales inválidas")
  }

  const validPassword = await verifyPassword(password, user.passwordHash, pepper)

  if (!validPassword) {
    await registerFailedAttempt(db, keys)
    throw new ApiError(401, "INVALID_CREDENTIALS", "Credenciales inválidas")
  }

  await clearFailedAttempts(db, keys)
  await deleteExpiredSessions(db, nowIso())

  const token = generateSessionToken()
  const expiresAt = addDaysIso(SESSION_DAYS)

  await createSession(db, {
    id: newId(),
    userId: user.id,
    tokenHash: await hashSessionToken(token),
    expiresAt,
    createdAt: nowIso(),
  })

  return { user, token, expiresAt }
}

export async function getCurrentSession(db: Database, token: string) {
  return findValidSessionByTokenHash(db, await hashSessionToken(token), nowIso())
}

export async function logout(db: Database, token: string | null): Promise<void> {
  if (!token) {
    return
  }

  await deleteSessionByTokenHash(db, await hashSessionToken(token))
}

export async function changePassword(
  db: Database,
  userId: string,
  currentPassword: string,
  newPassword: string,
  pepper: string,
): Promise<void> {
  assertPepper(pepper)

  const user = await findUserById(db, userId)

  if (!user || !user.isActive) {
    throw new ApiError(401, "UNAUTHORIZED", "Usuario no válido")
  }

  const validPassword = await verifyPassword(currentPassword, user.passwordHash, pepper)

  if (!validPassword) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "La contraseña actual no es correcta")
  }

  const passwordHash = await hashPassword(newPassword, pepper)

  await updateUser(db, userId, {
    passwordHash,
    updatedAt: nowIso(),
  })
  await deleteSessionsByUserId(db, userId)
}
