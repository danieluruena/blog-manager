const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

const dateTimeFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—"
  }

  return dateFormatter.format(new Date(value))
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—"
  }

  return dateTimeFormatter.format(new Date(value))
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}
