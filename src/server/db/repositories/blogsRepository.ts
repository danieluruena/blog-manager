import { and, asc, desc, eq, getTableColumns, ne, sql, type SQL } from "drizzle-orm";

import type { Database } from "../client";
import { articles, blogs, type Blog, type NewBlog } from "../schema";

type BlogSort = "name" | "updated_at" | "created_at";

export type ListBlogsFilters = {
  q?: string;
  active?: boolean;
  page?: number;
  pageSize?: number;
  sort?: BlogSort;
};

export type BlogListItem = Blog & {
  articleCount: number;
};

export type PaginatedBlogs = {
  items: BlogListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listBlogs(
  db: Database,
  filters: ListBlogsFilters = {},
): Promise<PaginatedBlogs> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  const conditions: SQL[] = [];

  if (filters.q?.trim()) {
    const term = `%${filters.q.trim().toLowerCase()}%`;
    conditions.push(sql`lower(${blogs.name}) like ${term}`);
  }

  if (filters.active !== undefined) {
    conditions.push(eq(blogs.isActive, filters.active));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const orderBy =
    filters.sort === "name"
      ? asc(blogs.name)
      : filters.sort === "created_at"
        ? desc(blogs.createdAt)
        : desc(blogs.updatedAt);

  const [items, countRows] = await Promise.all([
    db
      .select({
        ...getTableColumns(blogs),
        articleCount: sql<number>`count(${articles.id})`,
      })
      .from(blogs)
      .leftJoin(articles, eq(articles.blogId, blogs.id))
      .where(where)
      .groupBy(blogs.id)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)` })
      .from(blogs)
      .where(where),
  ]);

  return {
    items,
    total: countRows[0]?.count ?? 0,
    page,
    pageSize,
  };
}

export async function listBlogsForSidebar(db: Database) {
  return db
    .select({
      id: blogs.id,
      name: blogs.name,
      slug: blogs.slug,
      isActive: blogs.isActive,
    })
    .from(blogs)
    .orderBy(asc(blogs.name));
}

export async function getBlogById(db: Database, id: string): Promise<Blog | null> {
  const rows = await db.select().from(blogs).where(eq(blogs.id, id)).limit(1);

  return rows[0] ?? null;
}

export async function getBlogBySlug(
  db: Database,
  slug: string,
  activeOnly = false,
): Promise<Blog | null> {
  const conditions = [eq(blogs.slug, slug)];

  if (activeOnly) {
    conditions.push(eq(blogs.isActive, true));
  }

  const rows = await db
    .select()
    .from(blogs)
    .where(and(...conditions))
    .limit(1);

  return rows[0] ?? null;
}

export async function blogSlugExists(
  db: Database,
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const conditions = [eq(blogs.slug, slug)];

  if (excludeId) {
    conditions.push(ne(blogs.id, excludeId));
  }

  const rows = await db
    .select({ id: blogs.id })
    .from(blogs)
    .where(and(...conditions))
    .limit(1);

  return rows.length > 0;
}

export async function createBlog(db: Database, input: NewBlog): Promise<Blog> {
  const [blog] = await db.insert(blogs).values(input).returning();

  if (!blog) {
    throw new Error("No se pudo crear el blog");
  }

  return blog;
}

export async function updateBlog(
  db: Database,
  id: string,
  input: Partial<Omit<NewBlog, "id" | "createdAt">>,
): Promise<Blog | null> {
  const [blog] = await db.update(blogs).set(input).where(eq(blogs.id, id)).returning();

  return blog ?? null;
}

export async function deleteBlog(db: Database, id: string): Promise<boolean> {
  const rows = await db.delete(blogs).where(eq(blogs.id, id)).returning({ id: blogs.id });

  return rows.length > 0;
}

export async function countArticlesForBlog(db: Database, blogId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .where(eq(articles.blogId, blogId));

  return rows[0]?.count ?? 0;
}
