import { useQuery } from "@tanstack/react-query"
import { ArrowUpRight, ExternalLink, FileText, Plus, Settings, Sparkles } from "lucide-react"
import { Link, useParams } from "react-router"

import { EmptyState } from "../components/layout/empty-state"
import { PageHeader } from "../components/layout/page-header"
import { StatusBadge } from "../components/ui/status-badge"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import { Skeleton } from "../components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table"
import { useBlog } from "../hooks/use-blogs"
import { api } from "../lib/api"
import { formatDate } from "../lib/format"

export function BlogArticlesPage() {
  const params = useParams()
  const blogId = params.blogId ?? ""
  const blog = useBlog(blogId)
  const articles = useQuery({
    queryKey: ["articles", blogId, "recent"],
    queryFn: () => api.listArticles(blogId, { page: 1, pageSize: 50, sort: "updated_at" }),
    enabled: Boolean(blogId),
  })

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
        <a
          href={currentBlog.siteUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-brand"
        >
          <ExternalLink className="size-3" />
          {currentBlog.siteUrl}
        </a>
        <span className="text-line">·</span>
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="size-3 text-featured" />
          El editor completo llega en la Fase 5
        </span>
      </div>

      {articles.isLoading ? (
        <Card className="border-line bg-surface">
          <CardContent className="space-y-3 px-5">
            <Skeleton className="h-10 w-full bg-surface-2" />
            <Skeleton className="h-10 w-full bg-surface-2" />
            <Skeleton className="h-10 w-full bg-surface-2" />
          </CardContent>
        </Card>
      ) : articles.isError ? (
        <EmptyState
          icon={FileText}
          title="No se pudieron cargar los artículos"
          description="Comprueba que la API está disponible y vuelve a intentarlo."
          action={
            <Button variant="outline" onClick={() => void articles.refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : articles.data && articles.data.data.length > 0 ? (
        <Card className="overflow-hidden border-line bg-surface py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-line hover:bg-transparent">
                  <TableHead className="pl-5">Artículo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Autor</TableHead>
                  <TableHead className="hidden lg:table-cell">Publicado</TableHead>
                  <TableHead className="pr-5 text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.data.data.map((article) => (
                  <TableRow key={article.id} className="border-line">
                    <TableCell className="max-w-md pl-5">
                      <p className="truncate font-medium text-ink">{article.title}</p>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                        /{article.slug}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={article.status} />
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {article.author}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {formatDate(article.publishedAt)}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/blogs/${currentBlog.id}/articles/${article.id}`}>
                          Abrir
                          <ArrowUpRight className="size-3.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={FileText}
          title="Este blog todavía no tiene artículos"
          description="El editor de artículos estará disponible en la Fase 5."
          action={
            <Button variant="outline" asChild>
              <Link to="/blogs">Volver a blogs</Link>
            </Button>
          }
        />
      )}
    </div>
  )
}
