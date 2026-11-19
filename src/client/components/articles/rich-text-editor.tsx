import { Loader2 } from "lucide-react"
import { lazy, Suspense } from "react"

const TiptapEditor = lazy(() =>
  import("./tiptap-editor").then((module) => ({ default: module.TiptapEditor })),
)

export function RichTextEditor({
  initialJson,
  initialHtml,
  onChange,
  onUploadImage,
}: {
  initialJson: string | null
  initialHtml: string
  onChange: (bodyJson: string) => void
  onUploadImage: (file: File) => Promise<string>
}) {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center gap-2 rounded-xl border border-line bg-surface text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Cargando editor…
        </div>
      }
    >
      <TiptapEditor
        initialJson={initialJson}
        initialHtml={initialHtml}
        onChange={onChange}
        onUploadImage={onUploadImage}
      />
    </Suspense>
  )
}
