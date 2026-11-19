import type { BlogDto } from "@shared/types"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet"
import { BlogForm } from "./blog-form"

export function BlogFormSheet({
  open,
  onOpenChange,
  blog,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  blog?: BlogDto
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-line bg-surface p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-line px-6 py-5">
          <SheetTitle>{blog ? "Editar blog" : "Nuevo blog"}</SheetTitle>
          <SheetDescription>
            {blog
              ? "Actualiza los datos, la URL o los orígenes CORS del blog."
              : "Asocia un blog a una página web y empieza a publicar artículos."}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <BlogForm
            key={blog?.id ?? "new"}
            blog={blog}
            onSaved={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
