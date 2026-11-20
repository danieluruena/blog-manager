import { and, asc, eq, ne, sql } from "drizzle-orm"

import type { Database } from "../client"
import { users, type NewUser, type User } from "../schema"

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function findUserByEmail(db: Database, email: string): Promise<User | null> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1)

  return rows[0] ?? null
}

export async function findUserById(db: Database, id: string): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1)

  return rows[0] ?? null
}

export async function listUsers(db: Database): Promise<User[]> {
  return db.select().from(users).orderBy(asc(users.name))
}

export async function createUser(db: Database, input: NewUser): Promise<User> {
  const [user] = await db
    .insert(users)
    .values({
      ...input,
      email: normalizeEmail(input.email),
    })
    .returning()

  if (!user) {
    throw new Error("No se pudo crear el usuario")
  }

  return user
}

export async function updateUser(
  db: Database,
  id: string,
  input: Partial<
    Pick<
      NewUser,
      "name" | "email" | "passwordHash" | "role" | "isActive" | "isApproved" | "updatedAt"
    >
  >,
): Promise<User | null> {
  const [user] = await db
    .update(users)
    .set({
      ...input,
      ...(input.email !== undefined ? { email: normalizeEmail(input.email) } : {}),
    })
    .where(eq(users.id, id))
    .returning()

  return user ?? null
}

export async function deleteUser(db: Database, id: string): Promise<boolean> {
  const rows = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id })

  return rows.length > 0
}

export async function countActiveAdmins(db: Database, excludeId?: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(
      and(
        eq(users.role, "admin"),
        eq(users.isActive, true),
        ...(excludeId ? [ne(users.id, excludeId)] : []),
      ),
    )

  return rows[0]?.count ?? 0
}

export async function deactivateUser(
  db: Database,
  id: string,
  updatedAt: string,
): Promise<boolean> {
  const rows = await db
    .update(users)
    .set({ isActive: false, updatedAt })
    .where(eq(users.id, id))
    .returning({ id: users.id })

  return rows.length > 0
}
