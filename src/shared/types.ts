export type HealthResponse = {
  ok: true
  service: "blog-manager"
  version: string
  timestamp: string
}

export type ApiErrorResponse = {
  error: {
    code: string
    message: string
    requestId?: string
  }
}
