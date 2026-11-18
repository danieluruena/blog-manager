import type { Context } from "hono"
import type { ZodType } from "zod"

import type { AppEnv } from "../types"
import { ApiError, formatZodIssues } from "./errors"

export async function parseJson<T>(c: Context<AppEnv>, schema: ZodType<T>): Promise<T> {
  let body: unknown

  try {
    body = await c.req.json()
  } catch {
    throw new ApiError(400, "VALIDATION_ERROR", "El cuerpo debe ser JSON válido")
  }

  const result = schema.safeParse(body)

  if (!result.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "Datos inválidos", formatZodIssues(result.error))
  }

  return result.data
}

export function parseQuery<T>(c: Context<AppEnv>, schema: ZodType<T>): T {
  const query = Object.fromEntries(new URL(c.req.url).searchParams)
  const result = schema.safeParse(query)

  if (!result.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Parámetros inválidos",
      formatZodIssues(result.error),
    )
  }

  return result.data
}
