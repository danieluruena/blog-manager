import { Loader2 } from "lucide-react"

export function FullPageLoader({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas">
      <div className="flex flex-col items-center gap-4">
        <div className="grid size-11 place-items-center rounded-xl border border-line bg-surface font-mono text-xs font-semibold text-brand">
          BM
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-brand" />
          {label}
        </div>
      </div>
    </div>
  )
}
