export function countWords(value: string): number {
  const trimmed = value.trim()

  return trimmed ? trimmed.split(/\s+/).length : 0
}
