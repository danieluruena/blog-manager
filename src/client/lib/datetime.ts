function pad(value: number): string {
  return String(value).padStart(2, "0")
}

/** Convierte una fecha ISO al valor que espera un input `datetime-local`. */
export function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) {
    return ""
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`

  return `${day}T${time}`
}

/** Convierte el valor de un input `datetime-local` a una fecha ISO en UTC. */
export function fromDateTimeLocal(value: string): string | null {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

export function nowDateTimeLocal(): string {
  return toDateTimeLocal(new Date().toISOString())
}
