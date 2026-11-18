import { fileURLToPath } from "node:url"

import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin"
import { defineConfig } from "vitest/config"

export default defineConfig(async () => {
  const migrations = await readD1Migrations(fileURLToPath(new URL("./migrations", import.meta.url)))

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            AUTH_PEPPER: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          },
        },
      }),
    ],
    resolve: {
      alias: {
        "@client": fileURLToPath(new URL("./src/client", import.meta.url)),
        "@server": fileURLToPath(new URL("./src/server", import.meta.url)),
        "@shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
      },
    },
    test: {
      include: ["tests/**/*.test.ts"],
      setupFiles: ["./tests/apply-migrations.ts"],
    },
  }
})
