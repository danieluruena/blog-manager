import { beforeEach, describe, expect, it } from "vitest"

import {
  apiFetch,
  clearDatabase,
  createTestArticle,
  createTestBlog,
  createTestUser,
  getSessionCookie,
  grantBlogPermission,
  jsonRequest,
  loginAs,
  richTextJson,
  TEST_PASSWORD,
} from "./helpers"

const REGISTER_PASSWORD = "Registered-Password-123"

async function setupAdmin() {
  const admin = await createTestUser({ email: "admin@example.com", role: "admin" })
  const { cookie } = await loginAs(admin)

  return { admin, cookie }
}

async function loginEmail(email: string, password: string) {
  const response = await apiFetch(
    jsonRequest("/api/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  )

  return { response, cookie: getSessionCookie(response) }
}

async function registerUser(email = "nuevo@example.com", name = "Nuevo Usuario") {
  const response = await apiFetch(
    jsonRequest("/api/auth/register", {
      method: "POST",
      body: { name, email, password: REGISTER_PASSWORD },
    }),
  )

  expect(response.status).toBe(201)

  return (
    (await response.json()) as {
      data: { user: { id: string; email: string; name: string; role: string; isApproved: boolean } }
    }
  ).data.user
}

beforeEach(async () => {
  await clearDatabase()
})

describe("registro y aprobación de usuarios", () => {
  it("crea cuentas pendientes y rechaza el login hasta aprobarlas con permisos", async () => {
    const registered = await registerUser()

    expect(registered.role).toBe("editor")
    expect(registered.isApproved).toBe(false)

    const pending = await loginEmail(registered.email, REGISTER_PASSWORD)
    expect(pending.response.status).toBe(403)
    expect(((await pending.response.json()) as { error: { message: string } }).error.message).toBe(
      "Usuario pendiente de aprobación",
    )

    const { cookie: adminCookie } = await setupAdmin()
    const blog = await createTestBlog()

    const users = await apiFetch(jsonRequest("/api/admin/users", { cookie: adminCookie }))
    const usersBody = (await users.json()) as {
      data: Array<{ id: string; email: string }>
    }
    const target = usersBody.data.find((user) => user.email === registered.email)
    expect(target).toBeDefined()

    const withoutPermissions = await apiFetch(
      jsonRequest(`/api/admin/users/${target?.id}`, {
        method: "PATCH",
        cookie: adminCookie,
        body: { isApproved: true },
      }),
    )
    expect(withoutPermissions.status).toBe(400)
    expect(((await withoutPermissions.json()) as { error: { code: string } }).error.code).toBe(
      "APPROVAL_REQUIRES_PERMISSION",
    )

    const approved = await apiFetch(
      jsonRequest(`/api/admin/users/${target?.id}`, {
        method: "PATCH",
        cookie: adminCookie,
        body: {
          isApproved: true,
          permissions: [{ blogId: blog.id, permission: "read" }],
        },
      }),
    )
    expect(approved.status).toBe(200)

    const approvedUser = (await approved.json()) as {
      data: { isApproved: boolean; permissions: Array<{ blogId: string; permission: string }> }
    }
    expect(approvedUser.data.isApproved).toBe(true)
    expect(approvedUser.data.permissions).toEqual([
      expect.objectContaining({ blogId: blog.id, permission: "read" }),
    ])

    const login = await loginEmail(registered.email, REGISTER_PASSWORD)
    expect(login.response.status).toBe(200)
    expect(login.cookie).not.toBeNull()
  })

  it("revoca la sesión cuando un administrador retira la aprobación", async () => {
    const { cookie: adminCookie } = await setupAdmin()
    const editor = await createTestUser({
      email: "editor@example.com",
      role: "editor",
    })
    const blog = await createTestBlog()
    await grantBlogPermission(editor.id, blog.id, "write")
    const login = await loginAs(editor)
    expect(login.response.status).toBe(200)

    const update = await apiFetch(
      jsonRequest(`/api/admin/users/${editor.id}`, {
        method: "PATCH",
        cookie: adminCookie,
        body: { isApproved: false },
      }),
    )
    expect(update.status).toBe(200)

    const me = await apiFetch(
      jsonRequest("/api/auth/me", {
        cookie: login.cookie,
      }),
    )
    expect(me.status).toBe(401)
  })
})

describe("gestión de usuarios", () => {
  it("lista, crea, actualiza y elimina usuarios", async () => {
    const { cookie: adminCookie } = await setupAdmin()
    const blog = await createTestBlog({ name: "Blog de permisos" })

    const create = await apiFetch(
      jsonRequest("/api/admin/users", {
        method: "POST",
        cookie: adminCookie,
        body: {
          name: "Editor Nuevo",
          email: "editor.nuevo@example.com",
          password: "Editor-Password-123",
          role: "editor",
          isActive: true,
          isApproved: false,
          permissions: [],
        },
      }),
    )
    expect(create.status).toBe(201)

    const created = (await create.json()) as {
      data: { id: string; email: string; isApproved: boolean }
    }
    expect(created.data.isApproved).toBe(false)

    const duplicate = await apiFetch(
      jsonRequest("/api/admin/users", {
        method: "POST",
        cookie: adminCookie,
        body: {
          name: "Duplicado",
          email: "editor.nuevo@example.com",
          password: "Editor-Password-123",
        },
      }),
    )
    expect(duplicate.status).toBe(409)

    const update = await apiFetch(
      jsonRequest(`/api/admin/users/${created.data.id}`, {
        method: "PATCH",
        cookie: adminCookie,
        body: {
          name: "Editor Actualizado",
          isApproved: true,
          permissions: [{ blogId: blog.id, permission: "write" }],
        },
      }),
    )
    expect(update.status).toBe(200)

    const updated = (await update.json()) as {
      data: {
        name: string
        isApproved: boolean
        permissions: Array<{ blogId: string; permission: string }>
      }
    }
    expect(updated.data.name).toBe("Editor Actualizado")
    expect(updated.data.isApproved).toBe(true)
    expect(updated.data.permissions[0]).toMatchObject({
      blogId: blog.id,
      permission: "write",
    })

    const list = await apiFetch(jsonRequest("/api/admin/users", { cookie: adminCookie }))
    const listBody = (await list.json()) as { data: Array<{ email: string }> }
    expect(listBody.data.some((user) => user.email === "editor.nuevo@example.com")).toBe(true)

    const remove = await apiFetch(
      jsonRequest(`/api/admin/users/${created.data.id}`, {
        method: "DELETE",
        cookie: adminCookie,
      }),
    )
    expect(remove.status).toBe(204)

    const listAfter = await apiFetch(jsonRequest("/api/admin/users", { cookie: adminCookie }))
    const listAfterBody = (await listAfter.json()) as { data: Array<{ email: string }> }
    expect(listAfterBody.data.some((user) => user.email === "editor.nuevo@example.com")).toBe(false)
  })

  it("impide que un administrador se elimine, se desactive o se quite el rol", async () => {
    const { admin, cookie } = await setupAdmin()

    const remove = await apiFetch(
      jsonRequest(`/api/admin/users/${admin.id}`, {
        method: "DELETE",
        cookie,
      }),
    )
    expect(remove.status).toBe(400)

    const deactivate = await apiFetch(
      jsonRequest(`/api/admin/users/${admin.id}`, {
        method: "PATCH",
        cookie,
        body: { isActive: false },
      }),
    )
    expect(deactivate.status).toBe(400)

    const demote = await apiFetch(
      jsonRequest(`/api/admin/users/${admin.id}`, {
        method: "PATCH",
        cookie,
        body: { role: "editor" },
      }),
    )
    expect(demote.status).toBe(400)
  })
})

describe("permisos por blog", () => {
  it("aplica consulta y edición a blogs, artículos y media", async () => {
    const { cookie: adminCookie } = await setupAdmin()
    const editor = await createTestUser({ email: "editor@example.com", role: "editor" })
    const readBlog = await createTestBlog({ name: "Blog de consulta" })
    const privateBlog = await createTestBlog({ name: "Blog privado" })
    await grantBlogPermission(editor.id, readBlog.id, "read")
    const article = await createTestArticle(readBlog.id)
    const login = await loginAs(editor)
    const editorCookie = login.cookie

    const blogs = await apiFetch(jsonRequest("/api/admin/blogs", { cookie: editorCookie }))
    const blogsBody = (await blogs.json()) as {
      data: Array<{ id: string; permission: string }>
    }
    expect(blogsBody.data).toEqual([
      expect.objectContaining({ id: readBlog.id, permission: "read" }),
    ])

    expect(
      (await apiFetch(jsonRequest(`/api/admin/blogs/${readBlog.id}`, { cookie: editorCookie })))
        .status,
    ).toBe(200)
    expect(
      (await apiFetch(jsonRequest(`/api/admin/blogs/${privateBlog.id}`, { cookie: editorCookie })))
        .status,
    ).toBe(403)

    expect(
      (
        await apiFetch(
          jsonRequest(`/api/admin/blogs/${readBlog.id}/articles`, { cookie: editorCookie }),
        )
      ).status,
    ).toBe(200)
    expect(
      (
        await apiFetch(
          jsonRequest(`/api/admin/blogs/${readBlog.id}/articles/${article.id}`, {
            cookie: editorCookie,
          }),
        )
      ).status,
    ).toBe(200)

    const createArticle = await apiFetch(
      jsonRequest(`/api/admin/blogs/${readBlog.id}/articles`, {
        method: "POST",
        cookie: editorCookie,
        body: {
          title: "No permitido",
          author: "Editor",
          bodyJson: richTextJson("Contenido"),
        },
      }),
    )
    expect(createArticle.status).toBe(403)

    const updateArticle = await apiFetch(
      jsonRequest(`/api/admin/blogs/${readBlog.id}/articles/${article.id}`, {
        method: "PATCH",
        cookie: editorCookie,
        body: { title: "Cambio no permitido" },
      }),
    )
    expect(updateArticle.status).toBe(403)

    expect((await apiFetch(jsonRequest("/api/admin/stats", { cookie: editorCookie }))).status).toBe(
      403,
    )
    expect((await apiFetch(jsonRequest("/api/admin/users", { cookie: editorCookie }))).status).toBe(
      403,
    )

    await grantBlogPermission(editor.id, readBlog.id, "write")

    const createAllowed = await apiFetch(
      jsonRequest(`/api/admin/blogs/${readBlog.id}/articles`, {
        method: "POST",
        cookie: editorCookie,
        body: {
          title: "Ahora permitido",
          author: "Editor",
          bodyJson: richTextJson("Contenido"),
          status: "draft",
        },
      }),
    )
    expect(createAllowed.status).toBe(201)

    // El administrador conserva acceso completo y sus blogs se listan como edición.
    const adminBlogs = await apiFetch(jsonRequest("/api/admin/blogs", { cookie: adminCookie }))
    const adminBlogsBody = (await adminBlogs.json()) as {
      data: Array<{ permission: string }>
    }
    expect(adminBlogsBody.data.every((blog) => blog.permission === "write")).toBe(true)
  })
})

describe("perfil", () => {
  it("actualiza el nombre y la contraseña del usuario autenticado", async () => {
    const user = await createTestUser({ email: "perfil@example.com", name: "Nombre Antiguo" })
    const { cookie } = await loginAs(user)

    const profile = await apiFetch(
      jsonRequest("/api/auth/profile", {
        method: "PATCH",
        cookie,
        body: { name: "Nombre Nuevo" },
      }),
    )
    expect(profile.status).toBe(200)
    expect(((await profile.json()) as { data: { user: { name: string } } }).data.user.name).toBe(
      "Nombre Nuevo",
    )

    const wrong = await apiFetch(
      jsonRequest("/api/auth/password", {
        method: "PATCH",
        cookie,
        body: {
          currentPassword: "Wrong-Password-123",
          newPassword: "Nueva-Password-123",
        },
      }),
    )
    expect(wrong.status).toBe(401)

    const right = await apiFetch(
      jsonRequest("/api/auth/password", {
        method: "PATCH",
        cookie,
        body: {
          currentPassword: TEST_PASSWORD,
          newPassword: "Nueva-Password-123",
        },
      }),
    )
    expect(right.status).toBe(204)

    const me = await apiFetch(jsonRequest("/api/auth/me", { cookie }))
    expect(me.status).toBe(200)
  })
})
