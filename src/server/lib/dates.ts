export function nowIso(): string {
  return new Date().toISOString()
}

export function addDaysIso(days: number, from: Date = new Date()): string {
  const date = new Date(from)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString()
}

export function normalizeIso(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new Error("Fecha inválida")
  }

  return date.toISOString()
}
