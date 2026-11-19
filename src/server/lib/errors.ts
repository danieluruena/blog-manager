import type { Context } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { ZodError } from "zod"

import type { AppEnv } from "../types"

export class ApiError extends Error {
  constructor(
    public status: ContentfulStatusCode,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export function formatZodIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }))
}

function retryAfterSeconds(details: unknown): number | null {
  if (details && typeof details === "object" && "retryAfterSeconds" in details) {
    const value = (details as { retryAfterSeconds: unknown }).retryAfterSeconds
    return typeof value === "number" && value > 0 ? value : null
  }

  return null
}

export function errorResponse(c: Context<AppEnv>, error: unknown): Response {
  const requestId = c.get("requestId")

  if (error instanceof ApiError) {
    const retryAfter = retryAfterSeconds(error.details)

    if (retryAfter) {
      c.header("Retry-After", String(retryAfter))
    }

    return c.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          requestId,
        },
      },
      error.status,
    )
  }

  if (error instanceof ZodError) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Datos inválidos",
          details: formatZodIssues(error),
          requestId,
        },
      },
      400,
    )
  }

  if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
    return c.json(
      {
        error: {
          code: "CONFLICT",
          message: "El recurso ya existe",
          requestId,
        },
      },
      409,
    )
  }

  console.error(
    JSON.stringify({
      level: "error",
      requestId,
      message: error instanceof Error ? error.message : "Error desconocido",
    }),
  )

  return c.json(
    {
      error: {
        code: "INTERNAL",
        message: "Error interno del servidor",
        requestId,
      },
    },
    500,
  )
}
