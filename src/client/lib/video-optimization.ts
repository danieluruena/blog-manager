import { maxSourceVideoBytes, maxVideoBytes } from "@shared/constants"

import { formatImageSize } from "./format"

export type OptimizedVideo = {
  file: File
  originalSize: number
  optimizedSize: number
  duration: number
}

const MAX_VIDEO_DIMENSION = 1920
const videoExtensionPattern = /\.(mp4|m4v|mov|webm|mkv|ogv|ts)$/i

/**
 * Convierte un vídeo local a WebM (VP9/VP8 + Opus) con Mediabunny y WebCodecs.
 * La librería se carga solo cuando se inserta un vídeo.
 */
export async function optimizeVideo(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<OptimizedVideo> {
  if (!file.type.startsWith("video/") && !videoExtensionPattern.test(file.name)) {
    throw new Error("El archivo no es un vídeo")
  }

  if (file.size > maxSourceVideoBytes) {
    throw new Error(
      `El vídeo original no puede superar los ${formatImageSize(maxSourceVideoBytes)}.`,
    )
  }

  const globals = globalThis as { VideoEncoder?: unknown; VideoDecoder?: unknown }

  if (!globals.VideoEncoder || !globals.VideoDecoder) {
    throw new Error(
      "Tu navegador no soporta la conversión de vídeo. Usa Chrome, Edge o Safari actualizado.",
    )
  }

  const {
    BlobSource,
    BufferTarget,
    Conversion,
    getFirstEncodableAudioCodec,
    getFirstEncodableVideoCodec,
    Input,
    MATROSKA,
    MP4,
    MPEG_TS,
    OGG,
    Output,
    QTFF,
    Quality,
    WebMOutputFormat,
  } = await import("mediabunny")

  const input = new Input({
    formats: [MP4, QTFF, MATROSKA, OGG, MPEG_TS],
    source: new BlobSource(file),
  })

  try {
    const readable = await input.canRead().catch(() => false)

    if (!readable) {
      throw new Error("El formato del vídeo no es compatible. Usa MP4, MOV, WebM, MKV, OGG o TS.")
    }

    const videoTrack = await input.getPrimaryVideoTrack()

    if (!videoTrack) {
      throw new Error("El vídeo no contiene una pista de imagen")
    }

    if (!(await videoTrack.canDecode())) {
      throw new Error("El navegador no puede decodificar este vídeo")
    }

    const displayWidth = await videoTrack.getDisplayWidth()
    const displayHeight = await videoTrack.getDisplayHeight()
    const scale = Math.min(1, MAX_VIDEO_DIMENSION / Math.max(displayWidth, displayHeight))
    const targetWidth = Math.max(2, Math.round(displayWidth * scale))
    const targetHeight = Math.max(2, Math.round(displayHeight * scale))
    const resize = displayWidth >= displayHeight ? { width: targetWidth } : { height: targetHeight }
    const videoCodec = await getFirstEncodableVideoCodec(["vp9", "vp8"], {
      width: targetWidth,
      height: targetHeight,
    })

    if (!videoCodec) {
      throw new Error("Tu navegador no puede codificar vídeo WebM (VP9/VP8)")
    }

    const audioTrack = await input.getPrimaryAudioTrack()
    const audioCodec =
      audioTrack && (await audioTrack.canDecode())
        ? await getFirstEncodableAudioCodec(["opus"])
        : null
    const duration = await input.computeDuration()
    const output = new Output({
      format: new WebMOutputFormat(),
      target: new BufferTarget(),
    })
    const conversion = await Conversion.init({
      input,
      output,
      tracks: "primary",
      video: {
        ...resize,
        codec: videoCodec,
        quality: new Quality("medium"),
        forceTranscode: true,
        hardwareAcceleration: "no-preference",
      },
      audio: audioCodec
        ? {
            codec: audioCodec,
            quality: new Quality({ bitrate: 128_000 }),
            forceTranscode: true,
          }
        : { discard: true },
      tags: {},
    })

    if (!conversion.isValid) {
      throw new Error("No se pudo preparar la conversión del vídeo a WebM")
    }

    conversion.onProgress = (progress) => onProgress?.(progress)
    await conversion.execute()

    const buffer = output.target.buffer

    if (!buffer) {
      throw new Error("No se pudo generar el vídeo WebM")
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "video"
    const optimizedFile = new File([buffer], `${baseName}.webm`, {
      type: "video/webm",
    })

    if (optimizedFile.size > maxVideoBytes) {
      throw new Error(
        `El vídeo optimizado supera los ${formatImageSize(maxVideoBytes)}. Prueba con un clip más corto o de menor resolución.`,
      )
    }

    return {
      file: optimizedFile,
      originalSize: file.size,
      optimizedSize: optimizedFile.size,
      duration,
    }
  } finally {
    input.dispose()
  }
}
