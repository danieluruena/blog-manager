import { ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "../ui/button"

type CoverImageFieldProps = {
  value: string | null
  disabled?: boolean
  onChange: (value: string | null) => void
  onSelect: (file: File) => Promise<string>
}

export function CoverImageField({
  value,
  disabled = false,
  onChange,
  onSelect,
}: CoverImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const isBusy = disabled || isProcessing

  async function handleFile(file: File | undefined): Promise<void> {
    if (!file) {
      return
    }

    setIsProcessing(true)
    const previous = value

    try {
      const url = await onSelect(file)

      if (previous?.startsWith("blob:")) {
        URL.revokeObjectURL(previous)
      }

      onChange(url)
    } catch {
      // onSelect ya muestra el error de optimización.
    } finally {
      setIsProcessing(false)

      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  function remove(): void {
    if (value?.startsWith("blob:")) {
      URL.revokeObjectURL(value)
    }

    onChange(null)
  }

  return (
    <div className="max-w-2xl">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        aria-label="Imagen de portada"
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0])
        }}
      />

      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-line bg-surface-2">
          <img
            src={value}
            alt="Portada del artículo"
            className="aspect-video w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2">
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={() => inputRef.current?.click()}
              disabled={isBusy}
            >
              {isProcessing ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <RefreshCw className="size-3" />
              )}
              Cambiar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="xs"
              onClick={remove}
              disabled={isBusy}
            >
              <Trash2 className="size-3" />
              Quitar
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isBusy}
          className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-surface-2/50 text-muted-foreground transition-colors hover:border-brand/60 hover:text-ink disabled:pointer-events-none disabled:opacity-50"
        >
          {isProcessing ? (
            <Loader2 className="size-6 animate-spin" />
          ) : (
            <ImagePlus className="size-6" />
          )}
          <span className="text-xs font-medium">
            {isProcessing ? "Optimizando…" : "Elegir imagen de portada"}
          </span>
          <span className="text-[10px]">JPEG, PNG, WebP o AVIF</span>
        </button>
      )}
    </div>
  )
}
