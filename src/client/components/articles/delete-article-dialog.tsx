import type { ArticleDto } from "@shared/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Loader2, Trash2 } from "lucide-react"
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

type DeletableArticle = Pick<ArticleDto, "id" | "title">

export function DeleteArticleDialog({
  blogId,
  article,
  open,
  onOpenChange,
  onDeleted,
}: {
  blogId: string
  article: DeletableArticle
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => api.deleteArticle(blogId, article.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] })
      queryClient.invalidateQueries({ queryKey: ["stats"] })
      queryClient.invalidateQueries({ queryKey: ["blog", blogId] })
      queryClient.removeQueries({ queryKey: ["article", blogId, article.id] })
      toast.success("Artículo eliminado")
      onOpenChange(false)
      onDeleted?.()
    },
  })

  const error = mutation.error instanceof ApiError ? mutation.error : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-line bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar artículo</DialogTitle>
          <DialogDescription>
            «{article.title}» se eliminará de forma permanente junto con su contenido. Esta acción
            no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="destructive" className="border-danger/30 bg-danger/10">
            <AlertTriangle className="size-4" />
            <AlertTitle>No se pudo eliminar el artículo</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Eliminar artículo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
