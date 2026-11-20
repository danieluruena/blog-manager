import { ImagePlus } from "lucide-react"

type ArticlePreviewProps = {
  variant: "horizontal" | "vertical"
  title: string
  description: string
  coverImage: string | null
}

function PreviewCover({ coverImage }: { coverImage: string | null }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-md border border-line bg-surface-2">
      {coverImage ? (
        <img src={coverImage} alt="" className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <ImagePlus className="size-3.5 sm:size-4" />
        </div>
      )}
    </div>
  )
}

export function ArticlePreview({ variant, title, description, coverImage }: ArticlePreviewProps) {
  const safeTitle = title.trim() || "Título del artículo"
  const safeDescription = description.trim() || "Descripción breve del artículo."

  if (variant === "horizontal") {
    return (
      <div className="rounded-lg border border-line bg-surface-2/40 p-2 sm:p-3">
        <div className="flex gap-2 sm:gap-3">
          <div className="w-20 shrink-0 sm:w-36 min-[2000px]:w-56">
            <PreviewCover coverImage={coverImage} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[11px] leading-tight font-medium text-ink sm:text-sm">
              {safeTitle}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground sm:mt-1 sm:text-xs">
              {safeDescription}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-line bg-surface-2/40 p-2 sm:p-3">
      <PreviewCover coverImage={coverImage} />
      <p className="mt-1.5 line-clamp-2 text-[11px] leading-tight font-medium text-ink sm:mt-2 sm:text-sm">
        {safeTitle}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground sm:mt-1 sm:text-xs">
        {safeDescription}
      </p>
    </div>
  )
}
