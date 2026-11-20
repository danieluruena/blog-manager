import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

import { articleStatusValues, userRoleValues, blogPermissionValues } from "../../shared/constants"

export {
  articleStatusValues,
  userRoleValues,
  blogPermissionValues,
  type ArticleStatus,
  type UserRole,
  type BlogPermission,
} from "../../shared/constants"

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: userRoleValues }).notNull().default("admin"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    isApproved: integer("is_approved", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    check("users_role_check", sql`${table.role} in ('admin', 'editor')`),
    check("users_is_active_check", sql`${table.isActive} in (0, 1)`),
    check("users_is_approved_check", sql`${table.isApproved} in (0, 1)`),
  ],
)

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_sessions_user").on(table.userId),
    index("idx_sessions_expires").on(table.expiresAt),
  ],
)

export const authAttempts = sqliteTable("auth_attempts", {
  attemptKey: text("attempt_key").primaryKey(),
  attempts: integer("attempts").notNull().default(0),
  windowStart: integer("window_start").notNull(),
  blockedUntil: integer("blocked_until"),
})

export const blogs = sqliteTable(
  "blogs",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull().default(""),
    siteUrl: text("site_url").notNull(),
    allowedOrigins: text("allowed_origins").notNull().default(""),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("idx_blogs_active").on(table.isActive),
    check("blogs_is_active_check", sql`${table.isActive} in (0, 1)`),
  ],
)

export const articles = sqliteTable(
  "articles",
  {
    id: text("id").primaryKey(),
    blogId: text("blog_id")
      .notNull()
      .references(() => blogs.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    author: text("author").notNull(),
    body: text("body").notNull().default(""),
    bodyJson: text("body_json"),
    coverImage: text("cover_image"),
    status: text("status", { enum: articleStatusValues }).notNull().default("draft"),
    createdAt: text("created_at").notNull(),
    publishedAt: text("published_at"),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("articles_blog_slug_unique").on(table.blogId, table.slug),
    index("idx_articles_blog_updated").on(table.blogId, table.updatedAt),
    index("idx_articles_blog_status_published").on(table.blogId, table.status, table.publishedAt),
    index("idx_articles_blog_created").on(table.blogId, table.createdAt),
    check(
      "articles_status_check",
      sql`${table.status} in ('draft', 'published', 'hidden', 'featured')`,
    ),
  ],
)

export const media = sqliteTable(
  "media",
  {
    id: text("id").primaryKey(),
    blogId: text("blog_id")
      .notNull()
      .references(() => blogs.id, { onDelete: "cascade" }),
    articleId: text("article_id").references(() => articles.id, { onDelete: "cascade" }),
    r2Key: text("r2_key").notNull().unique(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_media_blog").on(table.blogId),
    index("idx_media_article").on(table.articleId),
  ],
)

export const blogPermissions = sqliteTable(
  "blog_permissions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blogId: text("blog_id")
      .notNull()
      .references(() => blogs.id, { onDelete: "cascade" }),
    permission: text("permission", { enum: blogPermissionValues }).notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.blogId] }),
    index("idx_blog_permissions_blog").on(table.blogId),
    check("blog_permissions_permission_check", sql`${table.permission} in ('read', 'write')`),
  ],
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type AuthAttempt = typeof authAttempts.$inferSelect
export type NewAuthAttempt = typeof authAttempts.$inferInsert
export type Blog = typeof blogs.$inferSelect
export type NewBlog = typeof blogs.$inferInsert
export type Article = typeof articles.$inferSelect
export type NewArticle = typeof articles.$inferInsert
export type Media = typeof media.$inferSelect
export type NewMedia = typeof media.$inferInsert
export type BlogPermissionRow = typeof blogPermissions.$inferSelect
export type NewBlogPermission = typeof blogPermissions.$inferInsert
