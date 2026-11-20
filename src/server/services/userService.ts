import type {
  AdminUserCreateInput,
  AdminUserUpdateInput,
  BlogPermissionInput,
  RegisterInput,
} from "@shared/schemas"

import type { Database } from "../db/client"
import { getBlogById } from "../db/repositories/blogsRepository"
import {
  listPermissionsForUser,
  listPermissionsForUsers,
  replaceUserPermissions,
  type PermissionInput,
} from "../db/repositories/blogPermissionsRepository"
import {
  countActiveAdmins,
  createUser,
  deleteUser,
  findUserByEmail,
  findUserById,
  listUsers,
  updateUser,
} from "../db/repositories/usersRepository"
import type { User } from "../db/schema"
import { nowIso } from "../lib/dates"
import { toAdminUserDto, toUserDto } from "../lib/dto"
import { ApiError } from "../lib/errors"
import { newId } from "../lib/ids"
import { hashPassword } from "../lib/password"

function assertPepper(pepper: string): void {
  if (!pepper || pepper.length < 32) {
    throw new ApiError(
      500,
      "CONFIGURATION_ERROR",
      "Falta configurar AUTH_PEPPER (mínimo 32 caracteres)",
    )
  }
}

async function normalizePermissions(
  db: Database,
  permissions: BlogPermissionInput[],
): Promise<PermissionInput[]> {
  const unique = [...new Map(permissions.map((item) => [item.blogId, item])).values()]

  for (const item of unique) {
    const blog = await getBlogById(db, item.blogId)

    if (!blog) {
      throw new ApiError(400, "BLOG_NOT_FOUND", "Uno de los blogs seleccionados no existe")
    }
  }

  return unique
}

function assertApprovedHasPermissions(
  role: User["role"],
  isApproved: boolean,
  permissions: PermissionInput[],
): void {
  if (role === "admin") {
    return
  }

  if (isApproved && permissions.length === 0) {
    throw new ApiError(
      400,
      "APPROVAL_REQUIRES_PERMISSION",
      "Un usuario aprobado debe tener al menos un permiso de blog",
    )
  }
}

export async function registerUser(
  db: Database,
  input: RegisterInput,
  pepper: string,
): Promise<User> {
  assertPepper(pepper)

  if (await findUserByEmail(db, input.email)) {
    throw new ApiError(409, "EMAIL_IN_USE", "Ya existe una cuenta con ese email")
  }

  const timestamp = nowIso()

  return createUser(db, {
    id: newId(),
    email: input.email,
    name: input.name,
    passwordHash: await hashPassword(input.password, pepper),
    role: "editor",
    isActive: true,
    isApproved: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
}

export async function listAdminUsers(db: Database) {
  const users = await listUsers(db)
  const permissions = await listPermissionsForUsers(
    db,
    users.map((user) => user.id),
  )
  const byUser = new Map<string, typeof permissions>()

  for (const permission of permissions) {
    const current = byUser.get(permission.userId) ?? []
    current.push(permission)
    byUser.set(permission.userId, current)
  }

  return users.map((user) => toAdminUserDto(user, byUser.get(user.id) ?? []))
}

export async function createAdminUser(db: Database, input: AdminUserCreateInput, pepper: string) {
  assertPepper(pepper)

  if (await findUserByEmail(db, input.email)) {
    throw new ApiError(409, "EMAIL_IN_USE", "Ya existe una cuenta con ese email")
  }

  const role = input.role
  const isApproved = role === "admin" ? true : input.isApproved
  const permissions = role === "admin" ? [] : await normalizePermissions(db, input.permissions)

  assertApprovedHasPermissions(role, isApproved, permissions)

  const timestamp = nowIso()
  const user = await createUser(db, {
    id: newId(),
    email: input.email,
    name: input.name,
    passwordHash: await hashPassword(input.password, pepper),
    role,
    isActive: input.isActive,
    isApproved,
    createdAt: timestamp,
    updatedAt: timestamp,
  })

  try {
    await replaceUserPermissions(db, user.id, permissions, timestamp)
  } catch (error) {
    await deleteUser(db, user.id)
    throw error
  }

  return toAdminUserDto(user, await listPermissionsForUser(db, user.id))
}

export async function updateAdminUser(
  db: Database,
  actorId: string,
  userId: string,
  input: AdminUserUpdateInput,
) {
  const user = await findUserById(db, userId)

  if (!user) {
    throw new ApiError(404, "NOT_FOUND", "Usuario no encontrado")
  }

  const role = input.role ?? user.role
  const isActive = input.isActive ?? user.isActive
  const isApproved = role === "admin" ? true : (input.isApproved ?? user.isApproved)
  let permissions: PermissionInput[]

  if (role === "admin") {
    permissions = []
  } else if (input.permissions !== undefined) {
    permissions = await normalizePermissions(db, input.permissions)
  } else {
    permissions = await listPermissionsForUser(db, userId)
  }

  assertApprovedHasPermissions(role, isApproved, permissions)

  if (userId === actorId && !isActive) {
    throw new ApiError(400, "CANNOT_DEACTIVATE_SELF", "No puedes desactivar tu propia cuenta")
  }

  if (userId === actorId && role !== "admin") {
    throw new ApiError(400, "CANNOT_DEMOTE_SELF", "No puedes quitarte el rol de administrador")
  }

  const losesAdmin = user.role === "admin" && (role !== "admin" || !isActive)

  if (losesAdmin) {
    const otherAdmins = await countActiveAdmins(db, userId)

    if (otherAdmins === 0) {
      throw new ApiError(409, "LAST_ADMIN", "Debe existir al menos un administrador activo")
    }
  }

  const updated = await updateUser(db, userId, {
    ...(input.role !== undefined ? { role: input.role } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    ...(input.isApproved !== undefined || role === "admin" ? { isApproved } : {}),
    updatedAt: nowIso(),
  })

  if (!updated) {
    throw new ApiError(404, "NOT_FOUND", "Usuario no encontrado")
  }

  if (role === "admin") {
    await replaceUserPermissions(db, userId, [], nowIso())
  } else if (input.permissions !== undefined || user.role === "admin") {
    await replaceUserPermissions(db, userId, permissions, nowIso())
  }

  return toAdminUserDto(updated, await listPermissionsForUser(db, userId))
}

export async function deleteAdminUser(
  db: Database,
  actorId: string,
  userId: string,
): Promise<void> {
  if (userId === actorId) {
    throw new ApiError(400, "CANNOT_DELETE_SELF", "No puedes eliminar tu propia cuenta")
  }

  const user = await findUserById(db, userId)

  if (!user) {
    throw new ApiError(404, "NOT_FOUND", "Usuario no encontrado")
  }

  if (user.role === "admin") {
    const otherAdmins = await countActiveAdmins(db, userId)

    if (otherAdmins === 0) {
      throw new ApiError(409, "LAST_ADMIN", "Debe existir al menos un administrador activo")
    }
  }

  await deleteUser(db, userId)
}

export async function updateProfile(db: Database, userId: string, name: string) {
  const updated = await updateUser(db, userId, {
    name,
    updatedAt: nowIso(),
  })

  if (!updated) {
    throw new ApiError(404, "NOT_FOUND", "Usuario no encontrado")
  }

  return toUserDto(updated)
}
