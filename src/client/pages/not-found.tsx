import { Compass } from "lucide-react"
import { Link } from "react-router"

import { EmptyState } from "../components/layout/empty-state"
import { Button } from "../components/ui/button"

export function NotFoundPage() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <EmptyState
        icon={Compass}
        title="Página no encontrada"
        description="La ruta que buscas no existe o fue movida."
        action={
          <Button asChild>
            <Link to="/">Volver al panel</Link>
          </Button>
        }
      />
    </div>
  )
}
