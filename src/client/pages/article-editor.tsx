import { FileText } from "lucide-react"
import { Link, useParams } from "react-router"

import { ArticleForm } from "../components/articles/article-form"
import { EmptyState } from "../components/layout/empty-state"
import { PageHeader } from "../components/layout/page-header"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import { Skeleton } from "../components/ui/skeleton"
import { useArticle } from "../hooks/use-articles"
import { useAuth } from "../hooks/use-auth"
import { useBlog } from "../hooks/use-blogs"

export function ArticleEditorPage() {
  const params = useParams()
  const blogId = params.blogId ?? ""
  const articleId = params.articleId
  const blog = useBlog(blogId)
  const article = useArticle(blogId, articleId)
  const auth = useAuth()

  const loading = blog.isLoading || (Boolean(articleId) && article.isLoading)

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-3 w-32 bg-surface-2" />
          <Skeleton className="h-9 w-80 bg-surface-2" />
          <Skeleton className="h-4 w-64 bg-surface-2" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Skeleton className="h-40 w-full bg-surface-2" />
            <Skeleton className="h-[28rem] w-full bg-surface-2" />
          </div>
          <Skeleton className="h-96 w-full bg-surface-2" />
        </div>
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

  if (articleId && (article.isError || !article.data)) {
    return (
      <EmptyState
        icon={FileText}
        title="Artículo no encontrado"
        description="El artículo no existe o ha sido eliminado."
        action={
          <Button variant="outline" asChild>
            <Link to={`/blogs/${blogId}/articles`}>Volver a artículos</Link>
          </Button>
        }
      />
    )
  }

  const currentArticle = article.data?.data
  const currentBlog = blog.data.data

  if (currentBlog.permission !== "write") {
    if (!currentArticle) {
      return (
        <EmptyState
          icon={FileText}
          title="Solo consulta"
          description="No tienes permiso para crear artículos en este blog."
          action={
            <Button variant="outline" asChild>
              <Link to={`/blogs/${blogId}/articles`}>Volver a artículos</Link>
            </Button>
          }
        />
      )
    }

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={currentBlog.name}
          title={currentArticle.title}
          description={currentArticle.excerpt || "Lectura de artículo."}
          actions={
            <>
              <Badge variant="outline" className="border-line bg-surface-2 text-muted-foreground">
                Solo lectura
              </Badge>
              <Button variant="outline" asChild>
                <Link to={`/blogs/${blogId}/articles`}>Volver a artículos</Link>
              </Button>
            </>
          }
        />

        {currentArticle.coverImage ? (
          <img
            src={currentArticle.coverImage}
            alt=""
            className="max-h-72 w-full rounded-xl border border-line object-cover"
          />
        ) : null}

        <Card className="overflow-hidden border-line bg-surface py-0">
          <CardContent className="p-0">
            <div className="mx-auto max-w-3xl">
              <div
                className="tiptap"
                // El HTML lo genera el servidor con una lista blanca de nodos y estilos.
                dangerouslySetInnerHTML={{ __html: currentArticle.body }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <ArticleForm
      key={currentArticle?.id ?? "new"}
      blog={currentBlog}
      article={currentArticle}
      defaultAuthor={auth.data?.name ?? ""}
    />
  )
}
