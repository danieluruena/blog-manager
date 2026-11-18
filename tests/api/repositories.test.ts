import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import { createDb } from "../../src/server/db/client";
import { decodeCursor } from "../../src/server/lib/cursor";
import {
  countArticlesForBlog,
  createBlog,
  deleteBlog,
  listBlogs,
} from "../../src/server/db/repositories/blogsRepository";
import {
  createArticle,
  getArticleByBlogAndId,
  getPublicArticleByBlogSlug,
  listArticlesByBlog,
  listPublicArticlesByBlog,
} from "../../src/server/db/repositories/articlesRepository";
import {
  createSession,
  findValidSessionByTokenHash,
} from "../../src/server/db/repositories/sessionsRepository";
import {
  createUser,
  findUserByEmail,
  updateUser,
} from "../../src/server/db/repositories/usersRepository";
import {
  getDashboardStats,
  getRecentArticles,
} from "../../src/server/db/repositories/statsRepository";
import type { NewArticle, NewBlog } from "../../src/server/db/schema";

const db = createDb(env.DB);
const BASE_TIME = "2026-11-18T10:00:00.000Z";

function makeBlog(overrides: Partial<NewBlog> = {}): NewBlog {
  const id = crypto.randomUUID();

  return {
    id,
    name: "Blog de prueba",
    slug: `blog-${id.slice(0, 8)}`,
    description: "Descripción de prueba",
    siteUrl: "https://example.com",
    allowedOrigins: "",
    isActive: true,
    createdAt: BASE_TIME,
    updatedAt: BASE_TIME,
    ...overrides,
  };
}

function makeArticle(blogId: string, overrides: Partial<NewArticle> = {}): NewArticle {
  const id = crypto.randomUUID();

  return {
    id,
    blogId,
    title: "Artículo de prueba",
    slug: `articulo-${id.slice(0, 8)}`,
    excerpt: "Resumen de prueba",
    author: "Autor de prueba",
    body: "# Cuerpo del artículo",
    status: "draft",
    createdAt: BASE_TIME,
    publishedAt: null,
    updatedAt: BASE_TIME,
    ...overrides,
  };
}

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions"),
    env.DB.prepare("DELETE FROM articles"),
    env.DB.prepare("DELETE FROM media"),
    env.DB.prepare("DELETE FROM blogs"),
    env.DB.prepare("DELETE FROM users"),
    env.DB.prepare("DELETE FROM auth_attempts"),
  ]);
});

describe("blogsRepository", () => {
  it("lista blogs con búsqueda y conteo de artículos", async () => {
    const blog = await createBlog(db, makeBlog({ name: "Blog de la Página A" }));
    await createArticle(db, makeArticle(blog.id));

    const result = await listBlogs(db, { q: "página a" });

    expect(result.total).toBe(1);
    expect(result.items[0]?.id).toBe(blog.id);
    expect(result.items[0]?.articleCount).toBe(1);
  });

  it("bloquea el borrado de un blog con artículos", async () => {
    const blog = await createBlog(db, makeBlog());
    const article = await createArticle(db, makeArticle(blog.id));

    await expect(deleteBlog(db, blog.id)).rejects.toThrow();

    expect(await countArticlesForBlog(db, blog.id)).toBe(1);

    await env.DB.prepare("DELETE FROM articles WHERE id = ?").bind(article.id).run();

    await expect(deleteBlog(db, blog.id)).resolves.toBe(true);
  });
});

describe("articlesRepository", () => {
  it("aísla los artículos por blog y permite filtrar por estado y texto", async () => {
    const blogA = await createBlog(db, makeBlog());
    const blogB = await createBlog(db, makeBlog());

    const publishedA = await createArticle(
      db,
      makeArticle(blogA.id, {
        title: "Publicado en A",
        status: "published",
        publishedAt: BASE_TIME,
      }),
    );
    const draftA = await createArticle(
      db,
      makeArticle(blogA.id, { title: "Borrador de A", status: "draft" }),
    );
    await createArticle(
      db,
      makeArticle(blogB.id, {
        title: "Publicado en B",
        status: "published",
        publishedAt: BASE_TIME,
      }),
    );

    const allA = await listArticlesByBlog(db, blogA.id);

    expect(allA.total).toBe(2);
    expect(allA.items.every((article) => article.blogId === blogA.id)).toBe(true);

    const draftsA = await listArticlesByBlog(db, blogA.id, { status: "draft" });
    expect(draftsA.items.map((article) => article.id)).toEqual([draftA.id]);

    const searchA = await listArticlesByBlog(db, blogA.id, { q: "borrador" });
    expect(searchA.items.map((article) => article.id)).toEqual([draftA.id]);

    await expect(getArticleByBlogAndId(db, blogB.id, publishedA.id)).resolves.toBeNull();
  });

  it("expone solo artículos visibles y pagina con cursor", async () => {
    const blog = await createBlog(db, makeBlog({ slug: "blog-publico" }));

    const published = await createArticle(
      db,
      makeArticle(blog.id, {
        title: "Publicado",
        slug: "publicado",
        status: "published",
        publishedAt: "2026-11-10T10:00:00.000Z",
      }),
    );
    const featured = await createArticle(
      db,
      makeArticle(blog.id, {
        title: "Destacado",
        slug: "destacado",
        status: "featured",
        publishedAt: "2026-11-12T10:00:00.000Z",
      }),
    );
    await createArticle(
      db,
      makeArticle(blog.id, { title: "Borrador", slug: "borrador", status: "draft" }),
    );
    await createArticle(
      db,
      makeArticle(blog.id, {
        title: "Oculto",
        slug: "oculto",
        status: "hidden",
        publishedAt: "2026-11-11T10:00:00.000Z",
      }),
    );

    const firstPage = await listPublicArticlesByBlog(db, blog.id, { limit: 1 });

    expect(firstPage.items.map((article) => article.id)).toEqual([featured.id]);
    expect(firstPage.nextCursor).not.toBeNull();

    const cursor = firstPage.nextCursor ? decodeCursor(firstPage.nextCursor) : null;
    expect(cursor).not.toBeNull();

    const secondPage = await listPublicArticlesByBlog(db, blog.id, {
      limit: 1,
      cursor,
    });

    expect(secondPage.items.map((article) => article.id)).toEqual([published.id]);
    expect(secondPage.nextCursor).toBeNull();

    const publicDetail = await getPublicArticleByBlogSlug(db, blog.slug, "publicado");
    expect(publicDetail?.article.id).toBe(published.id);
    expect(publicDetail?.blog.slug).toBe(blog.slug);

    await expect(getPublicArticleByBlogSlug(db, blog.slug, "borrador")).resolves.toBeNull();
    await expect(getPublicArticleByBlogSlug(db, blog.slug, "oculto")).resolves.toBeNull();
  });
});

describe("usersRepository y sessionsRepository", () => {
  it("normaliza el email y valida sesiones activas", async () => {
    const user = await createUser(db, {
      id: crypto.randomUUID(),
      email: "  Admin@Example.com ",
      name: "Admin",
      passwordHash: "test-hash",
      role: "admin",
      isActive: true,
      createdAt: BASE_TIME,
      updatedAt: BASE_TIME,
    });

    expect(user.email).toBe("admin@example.com");
    await expect(findUserByEmail(db, "ADMIN@example.com")).resolves.toMatchObject({
      id: user.id,
    });

    await createSession(db, {
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: "session-hash",
      expiresAt: "2026-11-25T10:00:00.000Z",
      createdAt: BASE_TIME,
    });

    await expect(
      findValidSessionByTokenHash(db, "session-hash", "2026-11-18T10:00:00.000Z"),
    ).resolves.toMatchObject({ user: { id: user.id } });

    await expect(
      findValidSessionByTokenHash(db, "session-hash", "2026-12-01T10:00:00.000Z"),
    ).resolves.toBeNull();

    await updateUser(db, user.id, { isActive: false, updatedAt: BASE_TIME });

    await expect(
      findValidSessionByTokenHash(db, "session-hash", "2026-11-18T10:00:00.000Z"),
    ).resolves.toBeNull();
  });
});

describe("statsRepository", () => {
  it("calcula métricas del panel y artículos recientes", async () => {
    const activeBlog = await createBlog(db, makeBlog({ name: "Activo", isActive: true }));
    await createBlog(db, makeBlog({ name: "Inactivo", isActive: false }));

    await createArticle(
      db,
      makeArticle(activeBlog.id, {
        status: "published",
        publishedAt: BASE_TIME,
        updatedAt: "2026-11-18T10:00:00.000Z",
      }),
    );
    await createArticle(
      db,
      makeArticle(activeBlog.id, {
        status: "featured",
        publishedAt: BASE_TIME,
        updatedAt: "2026-11-18T11:00:00.000Z",
      }),
    );
    await createArticle(
      db,
      makeArticle(activeBlog.id, {
        status: "draft",
        updatedAt: "2026-11-18T12:00:00.000Z",
      }),
    );

    const stats = await getDashboardStats(db);

    expect(stats).toEqual({
      totalBlogs: 2,
      activeBlogs: 1,
      totalArticles: 3,
      publishedArticles: 2,
      draftArticles: 1,
      featuredArticles: 1,
    });

    const recent = await getRecentArticles(db, 2);
    expect(recent).toHaveLength(2);
    expect(recent[0]?.status).toBe("draft");
    expect(recent[0]?.blogName).toBe("Activo");
  });
});
