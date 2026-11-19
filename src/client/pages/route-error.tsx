import { AlertTriangle } from "lucide-react"
import { isRouteErrorResponse, Link, useRouteError } from "react-router"

import { EmptyState } from "../components/layout/empty-state"
import { Button } from "../components/ui/button"

export function RouteErrorPage() {
  const error = useRouteError()

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Ha ocurrido un error inesperado."

  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-6">
      <EmptyState
        icon={AlertTriangle}
        title="Algo salió mal"
        description={message}
        action={
          <Button asChild variant="outline">
            <Link to="/">Volver al panel</Link>
          </Button>
        }
      />
    </div>
  )
}
