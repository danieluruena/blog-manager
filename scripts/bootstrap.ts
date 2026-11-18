import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { assertWranglerAuthenticated, runWrangler } from "./lib/wrangler";

const ROOT = process.cwd();
const CONFIG_PATH = resolve(ROOT, "wrangler.jsonc");
const DB_NAME = "blog-manager-db";
const BUCKET_NAME = "blog-manager-media";

type D1Record = {
  name?: string;
  database_name?: string;
  uuid?: string;
  database_id?: string;
};

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function assertAuthenticated(): void {
  try {
    assertWranglerAuthenticated(ROOT);
  } catch (error) {
    fail(error instanceof Error ? error.message : "Wrangler no está autenticado.");
  }
}

function normalizeD1List(value: unknown): D1Record[] {
  if (Array.isArray(value)) {
    return value as D1Record[];
  }

  if (value && typeof value === "object") {
    const record = value as { result?: unknown; databases?: unknown };

    if (Array.isArray(record.result)) {
      return record.result as D1Record[];
    }

    if (Array.isArray(record.databases)) {
      return record.databases as D1Record[];
    }
  }

  return [];
}

function listD1Databases(): D1Record[] {
  const result = runWrangler(["d1", "list", "--json"]);

  if (result.status !== 0) {
    fail(`No se pudo listar D1.\n${result.stderr || result.stdout}`);
  }

  try {
    const databases = normalizeD1List(JSON.parse(result.stdout));

    if (databases.length > 0) {
      return databases;
    }
  } catch {
    // Se intenta el fallback de texto.
  }

  if (result.stdout.includes(DB_NAME)) {
    return [{ name: DB_NAME }];
  }

  fail(`No se pudo interpretar la lista de D1.\n${result.stdout}`);
}

function findD1Database(): D1Record | undefined {
  return listD1Databases().find(
    (database) => database.name === DB_NAME || database.database_name === DB_NAME,
  );
}

function syncD1Config(databaseId: string): void {
  const config = readFileSync(CONFIG_PATH, "utf8");
  const updated = config.replace(/("database_id"\s*:\s*")[^"]*(")/, `$1${databaseId}$2`);

  if (updated !== config) {
    writeFileSync(CONFIG_PATH, updated, "utf8");
    console.log("✓ database_id actualizado en wrangler.jsonc.");
  }
}

function ensureD1(): void {
  const existing = findD1Database();

  if (existing) {
    console.log(`✓ D1 "${DB_NAME}" ya existe.`);

    const databaseId = existing.uuid ?? existing.database_id;
    if (databaseId) {
      syncD1Config(databaseId);
    } else {
      console.log(
        "  No se pudo leer el database_id desde `wrangler d1 list --json`; revísalo en wrangler.jsonc.",
      );
    }

    return;
  }

  console.log(`→ Creando D1 "${DB_NAME}"...`);

  const result = runWrangler(["d1", "create", DB_NAME, "--update-config", "--binding", "DB"]);

  if (result.status !== 0) {
    fail(`No se pudo crear D1.\n${result.stderr || result.stdout}`);
  }

  console.log(`✓ D1 "${DB_NAME}" creada y binding actualizado.`);
}

function r2BucketExists(): boolean {
  const result = runWrangler(["r2", "bucket", "list"]);

  if (result.status !== 0) {
    fail(`No se pudo listar R2.\n${result.stderr || result.stdout}`);
  }

  return result.stdout.includes(BUCKET_NAME);
}

function ensureR2(): void {
  if (r2BucketExists()) {
    console.log(`✓ R2 "${BUCKET_NAME}" ya existe.`);
    return;
  }

  console.log(`→ Creando R2 "${BUCKET_NAME}"...`);

  const result = runWrangler([
    "r2",
    "bucket",
    "create",
    BUCKET_NAME,
    "--update-config",
    "--binding",
    "MEDIA",
  ]);

  if (result.status !== 0) {
    fail(`No se pudo crear R2.\n${result.stderr || result.stdout}`);
  }

  console.log(`✓ R2 "${BUCKET_NAME}" creado y binding actualizado.`);
}

function printSummary(): void {
  const config = readFileSync(CONFIG_PATH, "utf8");
  const databaseId = config.match(/"database_id"\s*:\s*"([^"]+)"/)?.[1];

  console.log("\nConfiguración actual:");
  console.log(`  wrangler.jsonc → ${CONFIG_PATH}`);
  console.log(`  D1 database_id → ${databaseId ?? "no encontrado"}`);
  console.log(`  R2 bucket     → ${BUCKET_NAME}`);
  console.log(`
Siguientes pasos:
  1. npx wrangler d1 migrations apply ${DB_NAME} --local
  2. npm run user:create
  3. npm run dev
  4. npm run deploy (cuando quieras publicar)
`);
}

function main(): void {
  console.log("Blog Manager · bootstrap de Cloudflare\n");
  assertAuthenticated();
  ensureD1();
  ensureR2();
  printSummary();
}

main();
