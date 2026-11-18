import { AlertCircle, RotateCcw } from "lucide-react"
import { Navigate, Outlet, useLocation } from "react-router"

import { useAuth } from "../../hooks/use-auth"
import { Button } from "../ui/button"
import { FullPageLoader } from "../layout/full-page-loader"

export function ProtectedRoute() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.isLoading) {
    return <FullPageLoader label="Comprobando sesión…" />
  }

  if (auth.isError) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-6">
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 text-center">
          <div className="mx-auto grid size-11 place-items-center rounded-xl border border-danger/30 bg-danger/10 text-danger">
            <AlertCircle className="size-5" />
          </div>
          <h1 className="mt-4 text-lg font-semibold">No se pudo comprobar la sesión</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Comprueba que la API está disponible e inténtalo de nuevo.
          </p>
          <Button className="mt-5" variant="outline" onClick={() => void auth.refetch()}>
            <RotateCcw className="size-4" />
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  if (!auth.data) {
    return (
      <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
    )
  }

  return <Outlet />
}
