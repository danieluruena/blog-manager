import { ExternalLink, FileText, Settings, Trash2 } from "lucide-react"
import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"

import { DeleteBlogDialog } from "../components/blogs/delete-blog-dialog"
import { BlogForm } from "../components/blogs/blog-form"
import { EmptyState } from "../components/layout/empty-state"
import { PageHeader } from "../components/layout/page-header"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Skeleton } from "../components/ui/skeleton"
import { useBlog } from "../hooks/use-blogs"

export function BlogSettingsPage() {
  const params = useParams()
  const blogId = params.blogId ?? ""
  const blog = useBlog(blogId)
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (blog.isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-72 bg-surface-2" />
        <Skeleton className="h-4 w-96 bg-surface-2" />
        <Skeleton className="h-96 w-full bg-surface-2" />
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
  const articleCount = currentBlog.articleCount ?? 0

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Ajustes"
        title={currentBlog.name}
        description="Configura la identidad, la URL y los orígenes CORS del blog."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/blogs/${currentBlog.id}/articles`}>
                <FileText className="size-4" />
                Ver artículos
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <a href={currentBlog.siteUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                Abrir sitio
              </a>
            </Button>
          </>
        }
      />

      <Card className="border-line bg-surface">
        <CardHeader className="px-5">
          <CardTitle className="text-base">Datos del blog</CardTitle>
          <CardDescription>
            El slug cambia la URL pública. Los orígenes CORS controlan qué webs pueden consultar la
            API desde el navegador.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          <BlogForm key={currentBlog.id} blog={currentBlog} />
        </CardContent>
      </Card>

      <Card className="border-danger/20 bg-surface">
        <CardHeader className="px-5">
          <div className="flex items-center gap-2 text-danger">
            <Trash2 className="size-4" />
            <CardTitle className="text-base text-danger">Zona de peligro</CardTitle>
          </div>
          <CardDescription>
            {articleCount > 0
              ? `Este blog tiene ${articleCount} artículos. El borrado está bloqueado hasta que los elimines.`
              : "Eliminar el blog es una acción permanente."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Settings className="size-3.5" />
            {articleCount > 0
              ? "Puedes desactivarlo para retirarlo de la API pública."
              : "No hay artículos asociados."}
          </div>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" />
            Eliminar blog
          </Button>
        </CardContent>
      </Card>

      <DeleteBlogDialog
        blog={currentBlog}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => navigate("/blogs")}
      />
    </div>
  )
}
