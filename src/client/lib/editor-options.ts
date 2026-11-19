export type FontCategory = "sans" | "serif" | "display" | "mono" | "handwriting" | "system"

export type FontOption = {
  name: string
  family: string
  category: FontCategory
  /** Pesos disponibles en Google Fonts. Por defecto 400 y 700. */
  weights?: number[]
  /** Nombres alternativos que pueden aparecer en el CSS. */
  aliases?: string[]
}

export const FONT_CATEGORY_LABELS: Record<Exclude<FontCategory, "system">, string> = {
  sans: "Sans",
  serif: "Serif",
  display: "Display",
  mono: "Mono",
  handwriting: "Manuscrita",
}

const CATEGORY_FALLBACKS: Record<FontCategory, string> = {
  sans: "ui-sans-serif, system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  display: "ui-sans-serif, system-ui, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Consolas, monospace",
  handwriting: "cursive",
  system: "sans-serif",
}

function googleFont(
  name: string,
  category: Exclude<FontCategory, "system">,
  weights: number[] = [400, 700],
): FontOption {
  const primary = name.includes(" ") ? `'${name}'` : name

  return {
    name,
    category,
    weights,
    family: `${primary}, ${CATEGORY_FALLBACKS[category]}`,
  }
}

/** Catálogo curado de Google Fonts populares, agrupado por categoría. */
export const GOOGLE_FONTS: FontOption[] = [
  // Sans serif
  googleFont("Inter", "sans"),
  googleFont("Roboto", "sans"),
  googleFont("Open Sans", "sans"),
  googleFont("Lato", "sans"),
  googleFont("Montserrat", "sans"),
  googleFont("Poppins", "sans"),
  googleFont("Nunito", "sans"),
  googleFont("Nunito Sans", "sans"),
  googleFont("Raleway", "sans"),
  googleFont("Work Sans", "sans"),
  googleFont("DM Sans", "sans"),
  googleFont("Manrope", "sans"),
  googleFont("Source Sans 3", "sans"),
  googleFont("Noto Sans", "sans"),
  googleFont("Ubuntu", "sans"),
  googleFont("Karla", "sans"),
  googleFont("Rubik", "sans"),
  googleFont("Mulish", "sans"),
  googleFont("Barlow", "sans"),
  googleFont("Quicksand", "sans"),
  googleFont("Outfit", "sans"),
  googleFont("Space Grotesk", "sans"),
  googleFont("Plus Jakarta Sans", "sans"),
  googleFont("Figtree", "sans"),
  googleFont("Sora", "sans"),
  googleFont("Public Sans", "sans"),
  googleFont("IBM Plex Sans", "sans"),
  googleFont("Fira Sans", "sans"),
  googleFont("PT Sans", "sans"),
  googleFont("Oxygen", "sans"),
  googleFont("Cabin", "sans"),
  googleFont("Assistant", "sans"),
  googleFont("Heebo", "sans"),
  googleFont("Hind", "sans"),
  googleFont("Overpass", "sans"),
  googleFont("Red Hat Display", "sans"),
  googleFont("Archivo", "sans"),
  googleFont("Archivo Narrow", "sans"),
  googleFont("Lexend", "sans"),
  googleFont("Chivo", "sans"),

  // Serif
  googleFont("Lora", "serif"),
  googleFont("Merriweather", "serif"),
  googleFont("Playfair Display", "serif"),
  googleFont("Libre Baskerville", "serif"),
  googleFont("Crimson Text", "serif"),
  googleFont("Crimson Pro", "serif"),
  googleFont("EB Garamond", "serif"),
  googleFont("Cormorant", "serif"),
  googleFont("Cormorant Garamond", "serif"),
  googleFont("Source Serif 4", "serif"),
  googleFont("Noto Serif", "serif"),
  googleFont("PT Serif", "serif"),
  googleFont("Bitter", "serif"),
  googleFont("Domine", "serif"),
  googleFont("Arvo", "serif"),
  googleFont("Vollkorn", "serif"),
  googleFont("Spectral", "serif"),
  googleFont("Frank Ruhl Libre", "serif"),
  googleFont("Zilla Slab", "serif"),
  googleFont("Literata", "serif"),
  googleFont("Newsreader", "serif"),
  googleFont("Fraunces", "serif"),
  googleFont("Libre Caslon Text", "serif"),
  googleFont("Petrona", "serif"),
  googleFont("DM Serif Display", "serif", [400]),
  googleFont("Instrument Serif", "serif", [400]),
  googleFont("Young Serif", "serif", [400]),
  googleFont("Bodoni Moda", "serif"),

  // Display
  googleFont("Bebas Neue", "display", [400]),
  googleFont("Oswald", "display"),
  googleFont("Archivo Black", "display", [400]),
  googleFont("Anton", "display", [400]),
  googleFont("Righteous", "display", [400]),
  googleFont("Abril Fatface", "display", [400]),
  googleFont("Alfa Slab One", "display", [400]),
  googleFont("Lobster", "display", [400]),
  googleFont("Rye", "display", [400]),
  googleFont("Cinzel", "display"),
  googleFont("Marcellus", "display", [400]),
  googleFont("Bungee", "display", [400]),
  googleFont("Black Ops One", "display", [400]),
  googleFont("Unbounded", "display"),
  googleFont("Syne", "display"),

  // Monoespaciada
  googleFont("JetBrains Mono", "mono"),
  googleFont("Fira Code", "mono"),
  googleFont("IBM Plex Mono", "mono"),
  googleFont("Space Mono", "mono"),
  googleFont("Source Code Pro", "mono"),
  googleFont("Roboto Mono", "mono"),
  googleFont("Inconsolata", "mono"),
  googleFont("Ubuntu Mono", "mono"),
  googleFont("Courier Prime", "mono"),
  googleFont("Anonymous Pro", "mono"),
  googleFont("DM Mono", "mono", [400, 500]),

  // Manuscrita
  googleFont("Caveat", "handwriting"),
  googleFont("Dancing Script", "handwriting"),
  googleFont("Pacifico", "handwriting", [400]),
  googleFont("Satisfy", "handwriting", [400]),
  googleFont("Great Vibes", "handwriting", [400]),
  googleFont("Allura", "handwriting", [400]),
  googleFont("Sacramento", "handwriting", [400]),
  googleFont("Kalam", "handwriting"),
  googleFont("Shadows Into Light", "handwriting", [400]),
  googleFont("Indie Flower", "handwriting", [400]),
  googleFont("Patrick Hand", "handwriting", [400]),
  googleFont("Permanent Marker", "handwriting", [400]),
]

/** Fuentes que no requieren descarga porque ya están en el sistema. */
export const SYSTEM_FONTS: FontOption[] = [
  { name: "Arial", family: "Arial, sans-serif", category: "system" },
  { name: "Georgia", family: "Georgia, serif", category: "system" },
  {
    name: "Times New Roman",
    family: "'Times New Roman', Times, serif",
    category: "system",
  },
  { name: "Courier New", family: "'Courier New', monospace", category: "system" },
  { name: "Verdana", family: "Verdana, sans-serif", category: "system" },
  { name: "Trebuchet MS", family: "'Trebuchet MS', sans-serif", category: "system" },
  { name: "Sistema", family: "system-ui, sans-serif", category: "system", aliases: ["system-ui"] },
]

export const DEFAULT_FONT_VALUE = "default"

const fontsByName = new Map(
  [...GOOGLE_FONTS, ...SYSTEM_FONTS].flatMap((font) => [
    [font.name.toLowerCase(), font] as const,
    ...(font.aliases ?? []).map((alias) => [alias.toLowerCase(), font] as const),
  ]),
)

/** Devuelve la primera familia de un valor CSS como `Lora, Georgia, serif`. */
export function primaryFontFamily(value: string): string {
  return value.replace(/["']/g, "").split(",")[0]?.trim().toLowerCase() ?? ""
}

export function findFont(value: string): FontOption | undefined {
  if (!value || value === DEFAULT_FONT_VALUE) {
    return undefined
  }

  return fontsByName.get(primaryFontFamily(value))
}

export const FONT_SIZES = [
  { label: "12 px", value: "12px" },
  { label: "14 px", value: "14px" },
  { label: "16 px", value: "16px" },
  { label: "18 px", value: "18px" },
  { label: "20 px", value: "20px" },
  { label: "24 px", value: "24px" },
  { label: "30 px", value: "30px" },
  { label: "36 px", value: "36px" },
  { label: "48 px", value: "48px" },
]

export const TEXT_COLORS = [
  { label: "Tinta", value: "#111827" },
  { label: "Gris", value: "#475569" },
  { label: "Rojo", value: "#dc2626" },
  { label: "Naranja", value: "#ea580c" },
  { label: "Amarillo", value: "#ca8a04" },
  { label: "Verde", value: "#16a34a" },
  { label: "Turquesa", value: "#0891b2" },
  { label: "Azul", value: "#2563eb" },
  { label: "Violeta", value: "#7c3aed" },
  { label: "Rosa", value: "#db2777" },
]

export const HIGHLIGHT_COLORS = [
  { label: "Amarillo", value: "#fef08a" },
  { label: "Verde", value: "#bbf7d0" },
  { label: "Azul", value: "#bfdbfe" },
  { label: "Rojo", value: "#fecaca" },
  { label: "Violeta", value: "#e9d5ff" },
  { label: "Naranja", value: "#fed7aa" },
]
