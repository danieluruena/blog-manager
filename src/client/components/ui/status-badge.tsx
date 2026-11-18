import type { ArticleStatus } from "@shared/constants"

import { cn } from "../../lib/utils"
import { Badge } from "./badge"

const labels: Record<ArticleStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  hidden: "Oculto",
  featured: "Destacado",
}

const styles: Record<ArticleStatus, string> = {
  draft: "border-line bg-surface-2 text-muted-foreground",
  published: "border-success/30 bg-success/10 text-success",
  hidden: "border-warning/30 bg-warning/10 text-warning",
  featured: "border-featured/30 bg-featured/10 text-featured",
}

export function StatusBadge({ status, className }: { status: ArticleStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", styles[status], className)}>
      {labels[status]}
    </Badge>
  )
}
