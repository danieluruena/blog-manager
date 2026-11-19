import { Check, ChevronDown, Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import {
  DEFAULT_FONT_VALUE,
  FONT_CATEGORY_LABELS,
  GOOGLE_FONTS,
  SYSTEM_FONTS,
  findFont,
  primaryFontFamily,
  type FontCategory,
  type FontOption,
} from "../../lib/editor-options"
import { loadGoogleFont } from "../../lib/font-loading"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"

type FontPickerProps = {
  value: string
  disabled?: boolean
  onChange: (family: string | null) => void
}

type FontGroup = {
  category: FontCategory
  label: string
  fonts: FontOption[]
}

const GOOGLE_CATEGORIES: Array<Exclude<FontCategory, "system">> = [
  "sans",
  "serif",
  "display",
  "mono",
  "handwriting",
]

function displayName(value: string): string {
  const font = findFont(value)

  if (font) {
    return font.name
  }

  const first = value.replace(/["']/g, "").split(",")[0]?.trim()

  return first || "Fuente"
}

export function FontPicker({ value, disabled = false, onChange }: FontPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [previewed, setPreviewed] = useState<Set<string>>(new Set())
  const searchRef = useRef<HTMLInputElement>(null)
  const current = findFont(value)
  const currentName = current?.name

  useEffect(() => {
    if (currentName) {
      loadGoogleFont(currentName)
    }
  }, [currentName])

  const query = search.trim().toLowerCase()

  const groups = useMemo<FontGroup[]>(() => {
    const matches = (font: FontOption): boolean => {
      if (!query) {
        return true
      }

      const category = font.category === "system" ? "sistema" : FONT_CATEGORY_LABELS[font.category]
      const normalizedCategory = category.toLowerCase()

      return (
        font.name.toLowerCase().includes(query) ||
        normalizedCategory.includes(query) ||
        query.includes(normalizedCategory)
      )
    }

    const result: FontGroup[] = []

    for (const category of GOOGLE_CATEGORIES) {
      const fonts = GOOGLE_FONTS.filter((font) => font.category === category && matches(font))

      if (fonts.length > 0) {
        result.push({
          category,
          label: FONT_CATEGORY_LABELS[category],
          fonts,
        })
      }
    }

    const systemFonts = SYSTEM_FONTS.filter(matches)

    if (systemFonts.length > 0) {
      result.push({ category: "system", label: "Sistema", fonts: systemFonts })
    }

    return result
  }, [query])

  function preview(font: FontOption): void {
    if (font.category === "system") {
      return
    }

    loadGoogleFont(font.name)
    setPreviewed((previous) => {
      if (previous.has(font.name)) {
        return previous
      }

      const next = new Set(previous)
      next.add(font.name)
      return next
    })
  }

  function select(font: FontOption | null): void {
    if (!font) {
      onChange(null)
    } else {
      loadGoogleFont(font.name)
      onChange(font.family)
    }

    setOpen(false)
    setSearch("")
  }

  function isSelected(font: FontOption): boolean {
    return primaryFontFamily(value) === font.name.toLowerCase()
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)

        if (!next) {
          setSearch("")
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          aria-label="Familia tipográfica"
          title="Familia tipográfica"
          className="h-8 w-[190px] justify-between gap-2 border border-line bg-transparent px-2 font-normal text-muted-foreground hover:text-ink"
        >
          <span
            className="min-w-0 flex-1 truncate text-left"
            style={current ? { fontFamily: current.family } : undefined}
          >
            {value === DEFAULT_FONT_VALUE ? "Fuente" : displayName(value)}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[340px] p-0"
        aria-label="Selector de fuente"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          searchRef.current?.focus()
        }}
      >
        <div className="border-b border-line p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar fuente…"
              aria-label="Buscar fuente"
              className="h-8 pl-8"
            />
          </div>
          <p className="mt-2 px-1 text-[11px] text-muted-foreground">
            {GOOGLE_FONTS.length} fuentes de Google · pasa el cursor para previsualizar
          </p>
        </div>
        <div role="listbox" aria-label="Fuentes" className="max-h-80 overflow-y-auto p-1">
          <button
            type="button"
            role="option"
            aria-selected={value === DEFAULT_FONT_VALUE}
            onClick={() => select(null)}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-hidden select-none hover:bg-accent focus:bg-accent"
          >
            <span className="flex-1">Predeterminada</span>
            {value === DEFAULT_FONT_VALUE && <Check className="size-4 shrink-0 text-brand" />}
          </button>

          {groups.map((group) => (
            <div key={group.category}>
              <p className="px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                {group.label}
              </p>
              {group.fonts.map((font) => (
                <button
                  key={font.name}
                  type="button"
                  role="option"
                  aria-selected={isSelected(font)}
                  onMouseEnter={() => preview(font)}
                  onFocus={() => preview(font)}
                  onClick={() => select(font)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-hidden select-none hover:bg-accent focus:bg-accent",
                    isSelected(font) && "bg-accent",
                  )}
                >
                  <span
                    className="flex-1 truncate"
                    style={previewed.has(font.name) ? { fontFamily: font.family } : undefined}
                  >
                    {font.name}
                  </span>
                  {isSelected(font) && <Check className="size-4 shrink-0 text-brand" />}
                </button>
              ))}
            </div>
          ))}

          {groups.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No hay fuentes que coincidan.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
