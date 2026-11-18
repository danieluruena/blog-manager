import { Settings } from "lucide-react"
import { Link, useParams } from "react-router"

import { EmptyState } from "../components/layout/empty-state"
import { PageHeader } from "../components/layout/page-header"
import { Button } from "../components/ui/button"

export function BlogSettingsPage() {
  const params = useParams()

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Ajustes"
        title="Ajustes del blog"
        description="La edición de nombre, URL, orígenes CORS y estado del blog llega en la Fase 4."
      />

      <EmptyState
        icon={Settings}
        title="Configuración en preparación"
        description="La API de blogs ya permite crear, editar y desactivar. La interfaz de ajustes se implementa en la siguiente fase."
        action={
          <Button variant="outline" asChild>
            <Link to={`/blogs/${params.blogId}/articles`}>Volver al blog</Link>
          </Button>
        }
      />
    </div>
  )
}
