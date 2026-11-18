import { FileText } from "lucide-react"
import { Link, useParams } from "react-router"

import { ArticleForm } from "../components/articles/article-form"
import { EmptyState } from "../components/layout/empty-state"
import { Button } from "../components/ui/button"
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

  return (
    <ArticleForm
      key={currentArticle?.id ?? "new"}
      blog={blog.data.data}
      article={currentArticle}
      defaultAuthor={auth.data?.name ?? ""}
    />
  )
}
