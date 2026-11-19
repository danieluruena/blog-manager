import { useQuery } from "@tanstack/react-query"
import { AlertCircle, ArrowUpRight, CheckCircle2, FileText, Library, Send } from "lucide-react"
import { Link } from "react-router"

import { PageHeader } from "../components/layout/page-header"
import { EmptyState } from "../components/layout/empty-state"
import { StatusBadge } from "../components/ui/status-badge"
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Skeleton } from "../components/ui/skeleton"
import { api } from "../lib/api"
import { formatDate } from "../lib/format"

function MetricCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string
  value: number
  icon: typeof Library
  hint: string
}) {
  return (
    <Card className="gap-4 border-line bg-surface py-5">
      <CardContent className="flex items-start justify-between gap-4 px-5">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{value}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
        </div>
        <div className="grid size-9 place-items-center rounded-lg border border-line bg-surface-2 text-brand">
          <Icon className="size-4" />
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const stats = useQuery({
    queryKey: ["stats"],
    queryFn: async () => (await api.getStats()).data,
  })

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Panel"
        title="Resumen editorial"
        description="Una vista rápida del estado de tus blogs y del contenido más reciente."
        actions={
          <Button variant="outline" asChild>
            <Link to="/blogs">
              <Library className="size-4" />
              Ver blogs
            </Link>
          </Button>
        }
      />

      {stats.isError ? (
        <Alert variant="destructive" className="border-danger/30 bg-danger/10">
          <AlertCircle className="size-4" />
          <AlertTitle>No se pudieron cargar las métricas</AlertTitle>
          <AlertDescription className="flex items-center gap-3">
            Comprueba la API e inténtalo de nuevo.
            <Button size="sm" variant="outline" onClick={() => void stats.refetch()}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="border-line bg-surface py-5">
                <CardContent className="space-y-3 px-5">
                  <Skeleton className="h-3 w-24 bg-surface-2" />
                  <Skeleton className="h-8 w-16 bg-surface-2" />
                  <Skeleton className="h-3 w-32 bg-surface-2" />
                </CardContent>
              </Card>
            ))
          : stats.data
            ? [
                {
                  label: "Blogs",
                  value: stats.data.totalBlogs,
                  icon: Library,
                  hint: `${stats.data.activeBlogs} activos`,
                },
                {
                  label: "Artículos",
                  value: stats.data.totalArticles,
                  icon: FileText,
                  hint: "En todos los blogs",
                },
                {
                  label: "Publicados",
                  value: stats.data.publishedArticles,
                  icon: Send,
                  hint: "Publicados o destacados",
                },
                {
                  label: "Borradores",
                  value: stats.data.draftArticles,
                  icon: CheckCircle2,
                  hint: "Pendientes de publicar",
                },
              ].map((metric) => <MetricCard key={metric.label} {...metric} />)
            : null}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="border-line bg-surface">
          <CardHeader className="flex flex-row items-center justify-between gap-4 px-5">
            <div>
              <CardTitle className="text-base">Actividad reciente</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Los últimos artículos actualizados.
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/blogs">
                Ver todo
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-5">
            {stats.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full bg-surface-2" />
                <Skeleton className="h-14 w-full bg-surface-2" />
                <Skeleton className="h-14 w-full bg-surface-2" />
              </div>
            ) : stats.data && stats.data.recentArticles.length > 0 ? (
              <div className="divide-y divide-line">
                {stats.data.recentArticles.map((article) => (
                  <Link
                    key={article.id}
                    to={`/blogs/${article.blogId}/articles/${article.id}`}
                    className="flex items-center gap-4 py-3 transition-colors first:pt-0 last:pb-0 hover:text-ink"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{article.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {article.blogName} · {formatDate(article.updatedAt)}
                      </p>
                    </div>
                    <StatusBadge status={article.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="Todavía no hay actividad"
                description="Cuando crees blogs y artículos, los últimos cambios aparecerán aquí."
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-line bg-surface">
          <CardHeader className="px-5">
            <CardTitle className="text-base">Siguiente paso</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              La aplicación está lista. Queda el despliegue a producción.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 px-5">
            <div className="rounded-xl border border-line bg-surface-2/60 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-success">
                Fase 5 · Completada
              </p>
              <p className="mt-2 text-sm font-medium text-ink">Editor de artículos</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Markdown, estados editoriales, fechas y publicación.
              </p>
            </div>
            <div className="rounded-xl border border-line bg-surface-2/60 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-success">
                Fase 6 · Completada
              </p>
              <p className="mt-2 text-sm font-medium text-ink">Imágenes en R2</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Pegar o arrastrar imágenes, con caché inmutable y limpieza al borrar.
              </p>
            </div>
            <div className="rounded-xl border border-line bg-surface-2/60 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-success">
                Fase 7 · Completada
              </p>
              <p className="mt-2 text-sm font-medium text-ink">Hardening y calidad</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Seguridad, accesibilidad, tests y documentación operativa.
              </p>
            </div>
            <div className="rounded-xl border border-line bg-surface-2/60 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Fase 8
              </p>
              <p className="mt-2 text-sm font-medium text-ink">Despliegue</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Recursos remotos, migraciones, CI/CD y smoke test en producción.
              </p>
            </div>
            <Button className="w-full" variant="outline" asChild>
              <Link to="/blogs">
                Explorar blogs
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
