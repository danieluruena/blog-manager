import type { BlogPermission } from "@shared/constants"

import type { Database } from "../db/client"
import { findBlogPermission } from "../db/repositories/blogPermissionsRepository"
import type { User } from "../db/schema"
import { ApiError } from "../lib/errors"

type PermissionUser = Pick<User, "id" | "role">

export async function getBlogPermission(
  db: Database,
  user: PermissionUser,
  blogId: string,
): Promise<BlogPermission | null> {
  if (user.role === "admin") {
    return "write"
  }

  return findBlogPermission(db, user.id, blogId)
}

export async function requireBlogPermission(
  db: Database,
  user: PermissionUser,
  blogId: string,
  required: BlogPermission = "read",
): Promise<BlogPermission> {
  const permission = await getBlogPermission(db, user, blogId)

  if (!permission) {
    throw new ApiError(403, "FORBIDDEN", "No tienes permiso para este blog")
  }

  if (required === "write" && permission !== "write") {
    throw new ApiError(403, "FORBIDDEN", "No tienes permiso para editar este blog")
  }

  return permission
}
