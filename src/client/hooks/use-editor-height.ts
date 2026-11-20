import { useState, type KeyboardEvent, type PointerEvent } from "react"

const STORAGE_KEY = "blog-manager:editor-height"
export const DEFAULT_EDITOR_HEIGHT = 512
export const MIN_EDITOR_HEIGHT = 240
const KEYBOARD_STEP = 32
const MAX_VIEWPORT_RATIO = 0.8

export function getMaxEditorHeight(): number {
  return Math.max(MIN_EDITOR_HEIGHT, Math.round(window.innerHeight * MAX_VIEWPORT_RATIO))
}

function clampHeight(value: number): number {
  return Math.min(Math.max(value, MIN_EDITOR_HEIGHT), getMaxEditorHeight())
}

function readStoredHeight(): number {
  try {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY))

    return Number.isFinite(stored) && stored > 0 ? clampHeight(stored) : DEFAULT_EDITOR_HEIGHT
  } catch {
    return DEFAULT_EDITOR_HEIGHT
  }
}

function storeHeight(value: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value))
  } catch {
    // Sin almacenamiento disponible; la altura solo dura lo que la pantalla abierta.
  }
}

export function useEditorHeight() {
  const [height, setHeight] = useState(() =>
    typeof window === "undefined" ? DEFAULT_EDITOR_HEIGHT : readStoredHeight(),
  )
  const [drag, setDrag] = useState<{ startY: number; startHeight: number } | null>(null)

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ startY: event.clientY, startHeight: height })
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag) {
      return
    }

    setHeight(clampHeight(drag.startHeight + event.clientY - drag.startY))
  }

  function onPointerEnd() {
    if (!drag) {
      return
    }

    setDrag(null)
    storeHeight(height)
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return
    }

    event.preventDefault()

    const next = clampHeight(height + (event.key === "ArrowDown" ? KEYBOARD_STEP : -KEYBOARD_STEP))

    setHeight(next)
    storeHeight(next)
  }

  function reset() {
    setHeight(DEFAULT_EDITOR_HEIGHT)
    storeHeight(DEFAULT_EDITOR_HEIGHT)
  }

  return {
    height,
    reset,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
      onKeyDown,
      onDoubleClick: reset,
    },
  }
}
