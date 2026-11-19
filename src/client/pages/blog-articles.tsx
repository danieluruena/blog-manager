import { articleStatusValues, type ArticleStatus } from "@shared/constants"
import type { ArticleSummaryDto, PaginatedResponse } from "@shared/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  FileText,
  Filter,
  ImagePlus,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Trash2,
} from "lucide-react"
import { useDeferredValue, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { toast } from "sonner"

import { DeleteArticleDialog } from "../components/articles/delete-article-dialog"
import { EmptyState } from "../components/layout/empty-state"
import { PageHeader } from "../components/layout/page-header"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
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
import { StatusBadge } from "../components/ui/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table"
import { useArticles } from "../hooks/use-articles"
import { useBlog } from "../hooks/use-blogs"
import { api } from "../lib/api"
import { isVisibleStatus } from "../lib/article-form"
import { formatDate, formatDateTime } from "../lib/format"

const PAGE_SIZE = 10

type StatusFilter = ArticleStatus | "all"
type ArticleSort = "updated_at" | "published_at" | "created_at" | "title"

const statusLabels: Record<ArticleStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  hidden: "Oculto",
  featured: "Destacado",
}

export function BlogArticlesPage() {
  const params = useParams()
  const blogId = params.blogId ?? ""
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const blog = useBlog(blogId)

  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [sort, setSort] = useState<ArticleSort>("updated_at")
  const [page, setPage] = useState(1)
  const [deletingArticle, setDeletingArticle] = useState<ArticleSummaryDto | null>(null)

  const articles = useArticles(blogId, {
    q: deferredSearch || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    page,
    pageSize: PAGE_SIZE,
    sort,
  })

  const toggleStatus = useMutation({
    mutationFn: ({
      article,
      nextStatus,
    }: {
      article: ArticleSummaryDto
      nextStatus: ArticleStatus
    }) => api.updateArticle(blogId, article.id, { status: nextStatus }),
    onMutate: async ({ article, nextStatus }) => {
      await queryClient.cancelQueries({ queryKey: ["articles", blogId] })

      const snapshot = queryClient.getQueriesData<PaginatedResponse<ArticleSummaryDto>>({
        queryKey: ["articles", blogId],
      })

      queryClient.setQueriesData<PaginatedResponse<ArticleSummaryDto>>(
        { queryKey: ["articles", blogId] },
        (current) =>
          current
            ? {
                ...current,
                data: current.data.map((item) =>
                  item.id === article.id ? { ...item, status: nextStatus } : item,
                ),
              }
            : current,
      )

      return { snapshot }
    },
    onError: (error, _variables, context) => {
      for (const [key, data] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, data)
      }

      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el artículo")
    },
    onSuccess: (_data, variables) => {
      toast.success(
        isVisibleStatus(variables.nextStatus) ? "Artículo publicado" : "Artículo despublicado",
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] })
      queryClient.invalidateQueries({ queryKey: ["stats"] })
      queryClient.invalidateQueries({ queryKey: ["article", blogId] })
      queryClient.invalidateQueries({ queryKey: ["blog", blogId] })
    },
  })

  function toggleArticleStatus(article: ArticleSummaryDto) {
    const nextStatus: ArticleStatus = isVisibleStatus(article.status) ? "draft" : "published"

    toggleStatus.mutate({ article, nextStatus })
  }

  function clearFilters() {
    setSearch("")
    setStatusFilter("all")
    setSort("updated_at")
    setPage(1)
  }

  if (blog.isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-72 bg-surface-2" />
        <Skeleton className="h-4 w-96 bg-surface-2" />
        <Skeleton className="h-64 w-full bg-surface-2" />
      </div>
    )
  }

  if (blog.isError || !blog.data) {
    return (
      <EmptyState
        icon={FileText}
        title="Blog no encontrado"
        description="El blog no existe o no tienes acceso a él."
        action={
          <Button variant="outline" asChild>
            <Link to="/blogs">Volver a blogs</Link>
          </Button>
        }
      />
    )
  }

  const currentBlog = blog.data.data
  const total = articles.data?.meta.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const firstItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const lastItem = Math.min(page * PAGE_SIZE, total)
  const hasFilters = Boolean(deferredSearch) || statusFilter !== "all"

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Blog"
        title={currentBlog.name}
        description={currentBlog.description || "Sin descripción."}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/blogs/${currentBlog.id}/settings`}>
                <Settings className="size-4" />
                Ajustes
              </Link>
            </Button>
            <Button asChild>
              <Link to={`/blogs/${currentBlog.id}/articles/new`}>
                <Plus className="size-4" />
                Nuevo artículo
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>{currentBlog.articleCount ?? 0} artículos</span>
        <span className="text-line">·</span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className={
              currentBlog.isActive
                ? "size-1.5 rounded-full bg-success"
                : "size-1.5 rounded-full bg-warning"
            }
          />
          {currentBlog.isActive ? "Blog activo" : "Blog inactivo"}
        </span>
        <span className="text-line">·</span>
        <span className="truncate">{currentBlog.siteUrl}</span>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Buscar por título o autor…"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as StatusFilter)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[200px]" aria-label="Filtrar por estado">
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <Filter className="size-3.5 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="Estado" />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {articleStatusValues.map((value) => (
                <SelectItem key={value} value={value}>
                  {statusLabels[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sort}
            onValueChange={(value) => {
              setSort(value as ArticleSort)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[190px]" aria-label="Ordenar artículos">
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <ArrowUpDown className="size-3.5 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="Ordenar" />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated_at">Actualizados</SelectItem>
              <SelectItem value="published_at">Publicación</SelectItem>
              <SelectItem value="created_at">Creación</SelectItem>
              <SelectItem value="title">Título</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar
            </Button>
          ) : null}
        </div>
      </div>

      {articles.isLoading ? (
        <Card className="border-line bg-surface">
          <CardContent className="space-y-3 px-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full bg-surface-2" />
            ))}
          </CardContent>
        </Card>
      ) : articles.isError ? (
        <EmptyState
          icon={RefreshCw}
          title="No se pudieron cargar los artículos"
          description="Comprueba que la API está disponible y vuelve a intentarlo."
          action={
            <Button variant="outline" onClick={() => void articles.refetch()}>
              <RefreshCw className="size-4" />
              Reintentar
            </Button>
          }
        />
      ) : articles.data && articles.data.data.length > 0 ? (
        <div className="space-y-4">
          <Card className="overflow-hidden border-line bg-surface py-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-line hover:bg-transparent">
                    <TableHead className="pl-5">Artículo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden md:table-cell">Autor</TableHead>
                    <TableHead className="hidden lg:table-cell">Publicado</TableHead>
                    <TableHead className="hidden xl:table-cell">Actualizado</TableHead>
                    <TableHead className="pr-5 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.data.data.map((article) => {
                    const visible = isVisibleStatus(article.status)
                    const pending =
                      toggleStatus.isPending && toggleStatus.variables?.article.id === article.id

                    return (
                      <TableRow key={article.id} className="border-line">
                        <TableCell className="max-w-md pl-5">
                          <div className="flex items-center gap-3">
                            <div className="relative aspect-video w-16 shrink-0 overflow-hidden rounded-md border border-line bg-surface-2">
                              {article.coverImage ? (
                                <img
                                  src={article.coverImage}
                                  alt=""
                                  loading="lazy"
                                  className="size-full object-cover"
                                />
                              ) : (
                                <div className="flex size-full items-center justify-center text-muted-foreground">
                                  <ImagePlus className="size-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <Link
                                to={`/blogs/${currentBlog.id}/articles/${article.id}`}
                                className="block truncate font-medium text-ink transition-colors hover:text-brand"
                              >
                                {article.title}
                              </Link>
                              <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                                /{article.slug}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={article.status} />
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                          {article.author}
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground lg:table-cell">
                          {formatDate(article.publishedAt)}
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground xl:table-cell">
                          {formatDateTime(article.updatedAt)}
                        </TableCell>
                        <TableCell className="pr-5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Acciones de ${article.title}`}
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem
                                onSelect={() =>
                                  navigate(`/blogs/${currentBlog.id}/articles/${article.id}`)
                                }
                              >
                                <Pencil className="size-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={pending}
                                onSelect={() => toggleArticleStatus(article)}
                              >
                                {visible ? (
                                  <EyeOff className="size-4" />
                                ) : (
                                  <Send className="size-4" />
                                )}
                                {visible ? "Despublicar" : "Publicar"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-danger focus:text-danger"
                                onSelect={() => setDeletingArticle(article)}
                              >
                                <Trash2 className="size-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Mostrando {firstItem}–{lastItem} de {total} artículos
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="size-4" />
                Anterior
              </Button>
              <span className="font-mono text-xs text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
              >
                Siguiente
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title={hasFilters ? "No hay artículos que coincidan" : "Este blog no tiene artículos"}
          description={
            hasFilters
              ? "Prueba con otra búsqueda o cambia el filtro de estado."
              : "Crea el primer artículo y publícalo cuando esté listo."
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : (
              <Button asChild>
                <Link to={`/blogs/${currentBlog.id}/articles/new`}>
                  <Plus className="size-4" />
                  Nuevo artículo
                </Link>
              </Button>
            )
          }
        />
      )}

      {deletingArticle ? (
        <DeleteArticleDialog
          blogId={currentBlog.id}
          article={deletingArticle}
          open={Boolean(deletingArticle)}
          onOpenChange={(open) => {
            if (!open) {
              setDeletingArticle(null)
            }
          }}
        />
      ) : null}
    </div>
  )
}
