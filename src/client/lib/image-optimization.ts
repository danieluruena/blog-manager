import {
  maxImageBytes,
  maxImageDimension,
  maxSourceImageBytes,
  sourceImageMimeTypeValues,
  webpQuality,
  type SourceImageMimeType,
} from "@shared/constants"

import { formatImageSize } from "./format"

export type OptimizedImage = {
  file: File
  originalSize: number
  optimizedSize: number
}

function isSourceImageMime(mime: string): mime is SourceImageMimeType {
  return (sourceImageMimeTypeValues as readonly string[]).includes(mime)
}

/**
 * Convierte la imagen a WebP en el navegador, limita el lado mayor y reduce el
 * peso antes de que se suba a R2. Lanza un error legible si no es posible.
 */
export async function optimizeImage(file: File): Promise<OptimizedImage> {
  if (!isSourceImageMime(file.type)) {
    throw new Error("Formato no soportado. Usa JPEG, PNG, WebP o AVIF.")
  }

  if (file.size > maxSourceImageBytes) {
    throw new Error(
      `La imagen original no puede superar los ${formatImageSize(maxSourceImageBytes)}.`,
    )
  }

  let bitmap: ImageBitmap

  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    throw new Error("No se pudo leer la imagen. Prueba con otro archivo.")
  }

  try {
    const longestSide = Math.max(bitmap.width, bitmap.height)
    const scale = longestSide > maxImageDimension ? maxImageDimension / longestSide : 1
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement("canvas")

    canvas.width = width
    canvas.height = height

    const context = canvas.getContext("2d")

    if (!context) {
      throw new Error("No se pudo preparar el lienzo para optimizar la imagen.")
    }

    context.drawImage(bitmap, 0, 0, width, height)

    const optimizedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", webpQuality)
    })

    if (!optimizedBlob || optimizedBlob.type !== "image/webp") {
      throw new Error(
        "Tu navegador no puede convertir a WebP. Usa una versión reciente de Chrome, Firefox o Safari.",
      )
    }

    // Si ya era WebP, no se reescaló y el original pesa menos, se conserva.
    const keepOriginal =
      file.type === "image/webp" && scale === 1 && file.size <= optimizedBlob.size
    const output = keepOriginal ? file : optimizedBlob

    if (output.size > maxImageBytes) {
      throw new Error(
        `La imagen optimizada sigue superando los ${formatImageSize(maxImageBytes)}. Prueba con una imagen más pequeña.`,
      )
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "imagen"

    return {
      file: new File([output], `${baseName}.webp`, {
        type: "image/webp",
        lastModified: Date.now(),
      }),
      originalSize: file.size,
      optimizedSize: output.size,
    }
  } finally {
    bitmap.close()
  }
}
