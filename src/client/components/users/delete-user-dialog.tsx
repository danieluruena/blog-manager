import type { AdminUserDto } from "@shared/types"
import { AlertTriangle, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { useDeleteUser } from "../../hooks/use-users"
import { ApiError } from "../../lib/api"
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
import { Button } from "../ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"

export function DeleteUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUserDto
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const mutation = useDeleteUser()
  const error = mutation.error instanceof ApiError ? mutation.error : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-line bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar usuario</DialogTitle>
          <DialogDescription>
            «{user.name}» ({user.email}) se eliminará de forma permanente junto con sus sesiones y
            permisos. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="destructive" className="border-danger/30 bg-danger/10">
            <AlertTriangle className="size-4" />
            <AlertTitle>No se pudo eliminar el usuario</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => {
              mutation.mutate(user.id, {
                onSuccess: () => {
                  toast.success("Usuario eliminado")
                  onOpenChange(false)
                },
              })
            }}
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Eliminar usuario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
