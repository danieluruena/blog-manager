import { Code2, Eye, Loader2 } from "lucide-react"
import { lazy, Suspense, useState } from "react"

import { Button } from "../ui/button"
import { Label } from "../ui/label"

const MdxEditor = lazy(() =>
  import("./mdx-editor").then((module) => ({ default: module.MdxEditor })),
)

type EditorMode = "visual" | "markdown"

const activeModeClass =
  "bg-brand/15 text-brand ring-1 ring-brand/30 hover:bg-brand/20 hover:text-brand"
const inactiveModeClass = "text-muted-foreground hover:bg-surface-2 hover:text-ink"

export function MarkdownEditor({
  id,
  value,
  onChange,
  onUploadImage,
}: {
  id?: string
  value: string
  onChange: (markdown: string) => void
  onUploadImage?: (file: File) => Promise<string>
}) {
  const [mode, setMode] = useState<EditorMode>("visual")
  const [revision, setRevision] = useState(0)

  function changeMode(next: EditorMode) {
    if (next === mode) {
      return
    }

    if (next === "visual") {
      setRevision((current) => current + 1)
    }

    setMode(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Label htmlFor={id}>Contenido</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Markdown con atajos, tablas, código e imágenes. Puedes pegarlas o arrastrarlas (máx. 5
            MB); se subirán al guardar.
          </p>
        </div>

        <div
          role="group"
          aria-label="Modo del editor"
          className="inline-flex items-center rounded-lg border border-line bg-surface-2/60 p-1"
        >
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => changeMode("visual")}
            aria-pressed={mode === "visual"}
            className={mode === "visual" ? activeModeClass : inactiveModeClass}
          >
            <Eye className="size-3.5" />
            Visual
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => changeMode("markdown")}
            aria-pressed={mode === "markdown"}
            className={mode === "markdown" ? activeModeClass : inactiveModeClass}
          >
            <Code2 className="size-3.5" />
            Markdown
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        {mode === "visual" ? (
          <Suspense
            fallback={
              <div className="flex h-96 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Cargando editor…
              </div>
            }
          >
            <MdxEditor
              key={revision}
              markdown={value}
              onUploadImage={onUploadImage}
              onChange={(markdown, initialMarkdownNormalize) => {
                if (!initialMarkdownNormalize) {
                  onChange(markdown)
                }
              }}
            />
          </Suspense>
        ) : (
          <textarea
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            spellCheck={false}
            placeholder={"# Título\n\nEscribe el contenido en markdown…"}
            className="min-h-96 w-full resize-y bg-transparent p-4 font-mono text-sm leading-6 text-ink outline-none placeholder:text-muted-foreground/60"
          />
        )}
      </div>
    </div>
  )
}
