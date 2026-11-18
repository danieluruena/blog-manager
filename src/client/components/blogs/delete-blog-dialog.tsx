import type { BlogDto } from "@shared/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Loader2, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { api, ApiError } from "../../lib/api"
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
import { Input } from "../ui/input"
import { Label } from "../ui/label"

export function DeleteBlogDialog({
  blog,
  open,
  onOpenChange,
  onDeleted,
}: {
  blog: BlogDto
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}) {
  const queryClient = useQueryClient()
  const [confirmation, setConfirmation] = useState("")
  const hasArticles = (blog.articleCount ?? 0) > 0

  useEffect(() => {
    setConfirmation("")
  }, [blog.id, open])

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["blogs"] })
    queryClient.invalidateQueries({ queryKey: ["stats"] })
    queryClient.invalidateQueries({ queryKey: ["blog", blog.id] })
  }

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteBlog(blog.id),
    onSuccess: () => {
      invalidate()
      toast.success("Blog eliminado")
      onOpenChange(false)
      onDeleted?.()
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: () => api.updateBlog(blog.id, { isActive: false }),
    onSuccess: () => {
      invalidate()
      toast.success("Blog desactivado")
      onOpenChange(false)
    },
  })

  const error =
    deleteMutation.error instanceof ApiError
      ? deleteMutation.error
      : deactivateMutation.error instanceof ApiError
        ? deactivateMutation.error
        : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-line bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {hasArticles ? "No se puede eliminar el blog" : "Eliminar blog"}
          </DialogTitle>
          <DialogDescription>
            {hasArticles
              ? `"${blog.name}" todavía tiene ${blog.articleCount ?? 0} artículos. Elimínalos o desactiva el blog.`
              : `"${blog.name}" se eliminará de forma permanente. Esta acción no se puede deshacer.`}
          </DialogDescription>
        </DialogHeader>

        {hasArticles ? (
          <Alert className="border-warning/30 bg-warning/10">
            <AlertTriangle className="size-4 text-warning" />
            <AlertTitle className="text-warning">El borrado está bloqueado</AlertTitle>
            <AlertDescription>
              Para conservar el contenido, puedes desactivar el blog. Dejará de estar disponible en
              la API pública, pero sus artículos seguirán en el panel.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="delete-blog-confirmation">
              Escribe <span className="font-mono text-ink">{blog.name}</span> para confirmar
            </Label>
            <Input
              id="delete-blog-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={blog.name}
              autoComplete="off"
            />
          </div>
        )}

        {error ? (
          <Alert variant="destructive" className="border-danger/30 bg-danger/10">
            <AlertTriangle className="size-4" />
            <AlertTitle>No se pudo completar la acción</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {hasArticles ? (
            <Button
              variant="outline"
              onClick={() => deactivateMutation.mutate()}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <AlertTriangle className="size-4" />
              )}
              Desactivar blog
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={confirmation !== blog.name || deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Eliminar blog
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
