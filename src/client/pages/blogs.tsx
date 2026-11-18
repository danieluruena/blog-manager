import { ArrowUpRight, ExternalLink, FileText, Globe2, Library, RefreshCw } from "lucide-react"
import { Link } from "react-router"

import { EmptyState } from "../components/layout/empty-state"
import { PageHeader } from "../components/layout/page-header"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Skeleton } from "../components/ui/skeleton"
import { useBlogs } from "../hooks/use-blogs"
import { formatDate } from "../lib/format"

export function BlogsPage() {
  const blogs = useBlogs({ page: 1, pageSize: 50, sort: "name" })

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Blogs"
        title="Tus blogs"
        description="Cada blog pertenece a una página web y mantiene sus propios artículos. La creación y edición llegan en la Fase 4."
      />

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
                <Skeleton className="h-8 w-full bg-surface-2" />
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
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base text-ink">{blog.name}</CardTitle>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      /{blog.slug}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      blog.isActive
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-line bg-surface-2 text-muted-foreground"
                    }
                  >
                    {blog.isActive ? "Activo" : "Inactivo"}
                  </Badge>
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

                <div className="flex items-center justify-between border-t border-line pt-4">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <FileText className="size-3.5" />
                      {blog.articleCount ?? 0} artículos
                    </span>
                    <span className="hidden sm:inline">
                      Actualizado {formatDate(blog.updatedAt)}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/blogs/${blog.id}/articles`}>
                      Abrir
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Library}
          title="Todavía no hay blogs"
          description="Cuando cree el CRUD de blogs podrás añadir el primero y asociarlo a una página web."
        />
      )}
    </div>
  )
}
