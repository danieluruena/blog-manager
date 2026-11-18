import { FileText } from "lucide-react"
import { Link, useParams } from "react-router"

import { EmptyState } from "../components/layout/empty-state"
import { PageHeader } from "../components/layout/page-header"
import { Button } from "../components/ui/button"

export function ArticleEditorPage() {
  const params = useParams()
  const isNew = !params.articleId
  const backTo = `/blogs/${params.blogId}/articles`

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Artículo"
        title={isNew ? "Nuevo artículo" : "Editar artículo"}
        description="El editor markdown, la vista previa y la subida de imágenes a R2 llegan en la Fase 5."
      />

      <EmptyState
        icon={FileText}
        title="Editor en preparación"
        description="La base visual y la API ya están listas. En la siguiente fase se implementa el editor completo con estados, fechas y markdown."
        action={
          <Button variant="outline" asChild>
            <Link to={backTo}>Volver a artículos</Link>
          </Button>
        }
      />
    </div>
  )
}
