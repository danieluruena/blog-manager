import type { AdminUserDto } from "@shared/types"
import {
  Clock3,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react"
import { useDeferredValue, useMemo, useState } from "react"
import { Navigate } from "react-router"

import { EmptyState } from "../components/layout/empty-state"
import { PageHeader } from "../components/layout/page-header"
import { DeleteUserDialog } from "../components/users/delete-user-dialog"
import { UserFormDialog } from "../components/users/user-form-dialog"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import { Input } from "../components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import { Skeleton } from "../components/ui/skeleton"
import { useAuth } from "../hooks/use-auth"
import { useBlogs } from "../hooks/use-blogs"
import { useUsers } from "../hooks/use-users"
import { formatDate } from "../lib/format"

type UserFilter = "all" | "pending" | "approved" | "inactive"

const roleLabels = {
  admin: "Administrador",
  editor: "Editor",
} as const

const permissionLabels = {
  read: "Consulta",
  write: "Edición",
} as const

function permissionSummary(user: AdminUserDto): string {
  if (user.role === "admin") {
    return "Acceso completo a todos los blogs"
  }

  if (user.permissions.length === 0) {
    return "Sin permisos asignados"
  }

  return user.permissions
    .slice(0, 2)
    .map((item) => `${item.blogName} · ${permissionLabels[item.permission]}`)
    .join(", ")
    .concat(user.permissions.length > 2 ? ` y ${user.permissions.length - 2} más` : "")
}

export function UsersPage() {
  const auth = useAuth()
  const users = useUsers()
  const blogs = useBlogs({ page: 1, pageSize: 100, sort: "name" })
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [filter, setFilter] = useState<UserFilter>("all")
  const [createOpen, setCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUserDto | null>(null)
  const [deletingUser, setDeletingUser] = useState<AdminUserDto | null>(null)

  const filteredUsers = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase()

    return (users.data ?? []).filter((user) => {
      const matchesSearch =
        !term || user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term)

      const matchesFilter =
        filter === "all" ||
        (filter === "pending" && !user.isApproved && user.role !== "admin") ||
        (filter === "approved" && user.isApproved) ||
        (filter === "inactive" && !user.isActive)

      return matchesSearch && matchesFilter
    })
  }, [users.data, deferredSearch, filter])

  if (!auth.data) {
    return null
  }

  const currentUser = auth.data

  if (currentUser.role !== "admin") {
    return <Navigate to="/" replace />
  }

  const total = users.data?.length ?? 0
  const pending =
    users.data?.filter((user) => !user.isApproved && user.role !== "admin").length ?? 0
  const admins = users.data?.filter((user) => user.role === "admin").length ?? 0
  const blogsList = blogs.data?.data ?? []

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administración"
        title="Usuarios"
        description="Aprueba cuentas, asigna permisos por blog y gestiona el acceso al panel."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nuevo usuario
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <Card className="gap-3 border-line bg-surface py-4">
          <CardContent className="flex items-center justify-between gap-3 px-5">
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="mt-1 text-2xl font-semibold text-ink">{total}</p>
            </div>
            <Users className="size-5 text-brand" />
          </CardContent>
        </Card>
        <Card className="gap-3 border-line bg-surface py-4">
          <CardContent className="flex items-center justify-between gap-3 px-5">
            <div>
              <p className="text-xs text-muted-foreground">Pendientes</p>
              <p className="mt-1 text-2xl font-semibold text-warning">{pending}</p>
            </div>
            <Clock3 className="size-5 text-warning" />
          </CardContent>
        </Card>
        <Card className="gap-3 border-line bg-surface py-4">
          <CardContent className="flex items-center justify-between gap-3 px-5">
            <div>
              <p className="text-xs text-muted-foreground">Administradores</p>
              <p className="mt-1 text-2xl font-semibold text-ink">{admins}</p>
            </div>
            <ShieldCheck className="size-5 text-brand" />
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre o email…"
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(value) => setFilter(value as UserFilter)}>
          <SelectTrigger className="w-full sm:w-[190px]" aria-label="Filtrar usuarios">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="approved">Aprobados</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {users.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="border-line bg-surface">
              <CardHeader className="space-y-3 px-5">
                <Skeleton className="h-5 w-2/3 bg-surface-2" />
                <Skeleton className="h-3 w-full bg-surface-2" />
              </CardHeader>
              <CardContent className="space-y-3 px-5">
                <Skeleton className="h-8 w-full bg-surface-2" />
                <Skeleton className="h-12 w-full bg-surface-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : users.isError ? (
        <EmptyState
          icon={RefreshCw}
          title="No se pudieron cargar los usuarios"
          description="Comprueba que la API está disponible y vuelve a intentarlo."
          action={
            <Button variant="outline" onClick={() => void users.refetch()}>
              <RefreshCw className="size-4" />
              Reintentar
            </Button>
          }
        />
      ) : filteredUsers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredUsers.map((user) => {
            const isSelf = user.id === currentUser.id
            const pendingUser = !user.isApproved && user.role !== "admin"

            return (
              <Card key={user.id} className="border-line bg-surface">
                <CardHeader className="px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base text-ink">{user.name}</CardTitle>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Acciones de ${user.name}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onSelect={() => setEditingUser(user)}>
                          <Pencil className="size-4" />
                          Editar y permisos
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!pendingUser}
                          onSelect={() => setEditingUser({ ...user, isApproved: true })}
                        >
                          <ShieldCheck className="size-4" />
                          Aprobar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-danger focus:text-danger"
                          disabled={isSelf}
                          onSelect={() => setDeletingUser(user)}
                        >
                          <Trash2 className="size-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 px-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        user.role === "admin"
                          ? "border-brand/30 bg-brand/10 text-brand"
                          : "border-line bg-surface-2 text-muted-foreground"
                      }
                    >
                      {roleLabels[user.role]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        user.isApproved
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-warning/30 bg-warning/10 text-warning"
                      }
                    >
                      {user.isApproved ? "Aprobado" : "Pendiente"}
                    </Badge>
                    {!user.isActive ? (
                      <Badge
                        variant="outline"
                        className="border-danger/30 bg-danger/10 text-danger"
                      >
                        Inactivo
                      </Badge>
                    ) : null}
                    {isSelf ? (
                      <Badge
                        variant="outline"
                        className="border-line bg-surface-2 text-muted-foreground"
                      >
                        Tú
                      </Badge>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-line bg-surface-2/40 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Permisos
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink">
                      {permissionSummary(user)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] text-muted-foreground">
                      Creado {formatDate(user.createdAt)}
                    </p>
                    {pendingUser ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingUser({ ...user, isApproved: true })}
                      >
                        <ShieldCheck className="size-3.5" />
                        Aprobar
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title={total === 0 ? "Todavía no hay usuarios" : "No hay usuarios que coincidan"}
          description={
            total === 0
              ? "Crea el primero o espera a que alguien se registre."
              : "Prueba con otra búsqueda o cambia el filtro."
          }
          action={
            total === 0 ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Crear usuario
              </Button>
            ) : undefined
          }
        />
      )}

      <UserFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        blogs={blogsList}
        blogsLoading={blogs.isLoading}
        currentUserId={currentUser.id}
      />

      <UserFormDialog
        open={Boolean(editingUser)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingUser(null)
          }
        }}
        user={editingUser ?? undefined}
        blogs={blogsList}
        blogsLoading={blogs.isLoading}
        currentUserId={currentUser.id}
      />

      {deletingUser ? (
        <DeleteUserDialog
          user={deletingUser}
          open={Boolean(deletingUser)}
          onOpenChange={(open) => {
            if (!open) {
              setDeletingUser(null)
            }
          }}
        />
      ) : null}
    </div>
  )
}
