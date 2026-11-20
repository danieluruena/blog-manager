import { and, asc, eq, inArray } from "drizzle-orm"

import type { Database } from "../client"
import { blogPermissions, blogs, type BlogPermission, type BlogPermissionRow } from "../schema"

export type UserPermission = BlogPermissionRow & {
  blogName: string
  blogSlug: string
}

export type PermissionInput = {
  blogId: string
  permission: BlogPermission
}

export async function listPermissionsForUser(
  db: Database,
  userId: string,
): Promise<UserPermission[]> {
  return db
    .select({
      userId: blogPermissions.userId,
      blogId: blogPermissions.blogId,
      permission: blogPermissions.permission,
      createdAt: blogPermissions.createdAt,
      blogName: blogs.name,
      blogSlug: blogs.slug,
    })
    .from(blogPermissions)
    .innerJoin(blogs, eq(blogs.id, blogPermissions.blogId))
    .where(eq(blogPermissions.userId, userId))
    .orderBy(asc(blogs.name))
}

export async function listPermissionsForUsers(
  db: Database,
  userIds: string[],
): Promise<UserPermission[]> {
  if (userIds.length === 0) {
    return []
  }

  return db
    .select({
      userId: blogPermissions.userId,
      blogId: blogPermissions.blogId,
      permission: blogPermissions.permission,
      createdAt: blogPermissions.createdAt,
      blogName: blogs.name,
      blogSlug: blogs.slug,
    })
    .from(blogPermissions)
    .innerJoin(blogs, eq(blogs.id, blogPermissions.blogId))
    .where(inArray(blogPermissions.userId, userIds))
    .orderBy(asc(blogs.name))
}

export async function findBlogPermission(
  db: Database,
  userId: string,
  blogId: string,
): Promise<BlogPermission | null> {
  const rows = await db
    .select({ permission: blogPermissions.permission })
    .from(blogPermissions)
    .where(and(eq(blogPermissions.userId, userId), eq(blogPermissions.blogId, blogId)))
    .limit(1)

  return rows[0]?.permission ?? null
}

export async function replaceUserPermissions(
  db: Database,
  userId: string,
  permissions: PermissionInput[],
  createdAt: string,
): Promise<void> {
  await db.delete(blogPermissions).where(eq(blogPermissions.userId, userId))

  const unique = [...new Map(permissions.map((item) => [item.blogId, item])).values()]

  if (unique.length === 0) {
    return
  }

  await db.insert(blogPermissions).values(
    unique.map((item) => ({
      userId,
      blogId: item.blogId,
      permission: item.permission,
      createdAt,
    })),
  )
}
