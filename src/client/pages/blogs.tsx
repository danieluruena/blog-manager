import type { BlogDto } from "@shared/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ArrowUpRight,
  ExternalLink,
  FileText,
  Globe2,
  Library,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
} from "lucide-react"
import { useDeferredValue, useState } from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"

import { DeleteBlogDialog } from "../components/blogs/delete-blog-dialog"
import { BlogFormSheet } from "../components/blogs/blog-form-sheet"
import { EmptyState } from "../components/layout/empty-state"
import { PageHeader } from "../components/layout/page-header"
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
import { Switch } from "../components/ui/switch"
import { useAuth } from "../hooks/use-auth"
import { useBlogs } from "../hooks/use-blogs"
import { api } from "../lib/api"
import { formatDate } from "../lib/format"
import { Badge } from "../components/ui/badge"

type ActiveFilter = "all" | "active" | "inactive"

export function BlogsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const auth = useAuth()
  const isAdmin = auth.data?.role === "admin"
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all")
  const [createOpen, setCreateOpen] = useState(false)
  const [editingBlog, setEditingBlog] = useState<BlogDto | null>(null)
  const [deletingBlog, setDeletingBlog] = useState<BlogDto | null>(null)

  const active = activeFilter === "all" ? undefined : activeFilter === "active"
  const blogs = useBlogs({
    q: deferredSearch || undefined,
    active,
    page: 1,
    pageSize: 50,
    sort: "name",
  })

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.updateBlog(id, { isActive }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] })
      queryClient.invalidateQueries({ queryKey: ["stats"] })
      queryClient.invalidateQueries({ queryKey: ["blog", variables.id] })
      toast.success(variables.isActive ? "Blog activado" : "Blog desactivado")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el blog")
    },
  })

  const hasFilters = Boolean(deferredSearch) || activeFilter !== "all"

  function clearFilters() {
    setSearch("")
    setActiveFilter("all")
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Blogs"
        title="Tus blogs"
        description="Cada blog pertenece a una página web y mantiene sus propios artículos."
        actions={
          isAdmin ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Nuevo blog
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar blogs…"
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {blogs.data?.meta.total ?? 0} blogs
          </span>
          <Select
            value={activeFilter}
            onValueChange={(value) => setActiveFilter(value as ActiveFilter)}
          >
            <SelectTrigger className="w-full sm:w-[170px]" aria-label="Filtrar por estado">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {blogs.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="border-line bg-surface">
              <CardHeader className="space-y-3 px-5">
                <Skeleton className="h-5 w-2/3 bg-surface-2" />
                <Skeleton className="h-3 w-full bg-surface-2" />
              </CardHeader>
              <CardContent className="space-y-3 px-5">
                <Skeleton className="h-3 w-1/2 bg-surface-2" />
                <Skeleton className="h-9 w-full bg-surface-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : blogs.isError ? (
        <EmptyState
          icon={RefreshCw}
          title="No se pudieron cargar los blogs"
          description="Comprueba que la API está disponible y vuelve a intentarlo."
          action={
            <Button variant="outline" onClick={() => void blogs.refetch()}>
              <RefreshCw className="size-4" />
              Reintentar
            </Button>
          }
        />
      ) : blogs.data && blogs.data.data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {blogs.data.data.map((blog) => (
            <Card
              key={blog.id}
              className="group border-line bg-surface transition-colors hover:border-brand/30"
            >
              <CardHeader className="px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base text-ink">{blog.name}</CardTitle>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        /{blog.slug}
                      </p>
                      {!isAdmin ? (
                        <Badge
                          variant="outline"
                          className={
                            blog.permission === "write"
                              ? "border-success/30 bg-success/10 text-success"
                              : "border-line bg-surface-2 text-muted-foreground"
                          }
                        >
                          {blog.permission === "write" ? "Edición" : "Consulta"}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  {isAdmin ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Acciones del blog">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onSelect={() => setEditingBlog(blog)}>
                          <Pencil className="size-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => navigate(`/blogs/${blog.id}/settings`)}>
                          <Settings className="size-4" />
                          Ajustes
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            window.open(blog.siteUrl, "_blank", "noopener,noreferrer")
                          }
                        >
                          <ExternalLink className="size-4" />
                          Abrir sitio
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-danger focus:text-danger"
                          onSelect={() => setDeletingBlog(blog)}
                        >
                          <Trash2 className="size-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
                <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {blog.description || "Sin descripción."}
                </p>
              </CardHeader>

              <CardContent className="space-y-4 px-5">
                <a
                  href={blog.siteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-brand"
                >
                  <Globe2 className="size-3.5 shrink-0" />
                  <span className="truncate">{blog.siteUrl}</span>
                  <ExternalLink className="size-3 shrink-0" />
                </a>

                <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <FileText className="size-3.5" />
                      {blog.articleCount ?? 0} artículos
                    </span>
                    <span className="hidden sm:inline">
                      Actualizado {formatDate(blog.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    {isAdmin ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Switch
                          checked={blog.isActive}
                          onCheckedChange={(checked) =>
                            toggle.mutate({ id: blog.id, isActive: checked })
                          }
                          disabled={toggle.isPending && toggle.variables?.id === blog.id}
                          aria-label={blog.isActive ? "Desactivar blog" : "Activar blog"}
                        />
                        {blog.isActive ? "Activo" : "Inactivo"}
                      </div>
                    ) : null}

                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/blogs/${blog.id}/articles`}>
                        Abrir
                        <ArrowUpRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Library}
          title={
            hasFilters
              ? "No hay blogs que coincidan"
              : isAdmin
                ? "Todavía no hay blogs"
                : "No tienes blogs asignados"
          }
          description={
            hasFilters
              ? "Prueba con otra búsqueda o cambia el filtro de estado."
              : isAdmin
                ? "Crea el primer blog y asígnalo a una de tus páginas web."
                : "Un administrador debe asignarte acceso de consulta o edición a uno o más blogs."
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : isAdmin ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Crear primer blog
              </Button>
            ) : undefined
          }
        />
      )}

      <BlogFormSheet open={createOpen} onOpenChange={setCreateOpen} />

      <BlogFormSheet
        open={Boolean(editingBlog)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingBlog(null)
          }
        }}
        blog={editingBlog ?? undefined}
      />

      {deletingBlog ? (
        <DeleteBlogDialog
          blog={deletingBlog}
          open={Boolean(deletingBlog)}
          onOpenChange={(open) => {
            if (!open) {
              setDeletingBlog(null)
            }
          }}
        />
      ) : null}
    </div>
  )
}
