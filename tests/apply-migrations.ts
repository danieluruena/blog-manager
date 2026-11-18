import { applyD1Migrations } from "cloudflare:test"
import { env } from "cloudflare:workers"

// La configuración de Vitest inyecta TEST_MIGRATIONS desde `migrations/`.
// `applyD1Migrations` es idempotente y solo aplica las migraciones pendientes.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
