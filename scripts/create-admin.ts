import { randomUUID } from "node:crypto"
import { unlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { stdin as input, stdout as output } from "node:process"
import { createInterface } from "node:readline/promises"
import { parseArgs } from "node:util"

import { nowIso } from "../src/server/lib/dates"
import { newId } from "../src/server/lib/ids"
import { hashPassword } from "../src/server/lib/password"

import { loadDevVars } from "./lib/env"
import { assertWranglerAuthenticated, runWrangler } from "./lib/wrangler"

const DB_NAME = "blog-manager-db"
const MIN_PASSWORD_LENGTH = 12

function usage(): string {
  return "Uso: npm run user:create -- --email <email> --name <nombre> [--role admin|editor] [--remote]"
}

async function promptLine(question: string): Promise<string> {
  const readline = createInterface({ input, output })

  try {
    return (await readline.question(question)).trim()
  } finally {
    readline.close()
  }
}

function promptHidden(question: string): Promise<string> {
  if (!input.isTTY) {
    return Promise.reject(
      new Error(
        "No hay una terminal interactiva. Define la variable ADMIN_PASSWORD para ejecutar en modo no interactivo.",
      ),
    )
  }

  return new Promise((resolve, reject) => {
    output.write(question)
    input.setRawMode(true)
    input.resume()
    input.setEncoding("utf8")

    let value = ""

    const cleanup = () => {
      input.off("data", onData)
      input.setRawMode(false)
      input.pause()
    }

    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === "\r" || character === "\n") {
          cleanup()
          output.write("\n")
          resolve(value)
          return
        }

        if (character === "\u0003") {
          cleanup()
          output.write("\n")
          reject(new Error("Operación cancelada."))
          return
        }

        if (character === "\u007f" || character === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1)
            output.write("\b \b")
          }
          continue
        }

        value += character
        output.write("*")
      }
    }

    input.on("data", onData)
  })
}

function validateEmail(email: string): void {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("El email no tiene un formato válido.")
  }
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      name: { type: "string" },
      role: { type: "string", default: "admin" },
      remote: { type: "boolean", default: false },
    },
    strict: true,
  })

  const remote = values.remote === true

  if (!remote) {
    loadDevVars()
  }

  const email = (
    values.email?.trim() || (await promptLine("Email del administrador: "))
  ).toLowerCase()
  const name = values.name?.trim() || (await promptLine("Nombre: "))

  if (!email) {
    throw new Error("El email es obligatorio.")
  }

  if (!name) {
    throw new Error("El nombre es obligatorio.")
  }

  validateEmail(email)

  if (name.length > 120) {
    throw new Error("El nombre no puede superar los 120 caracteres.")
  }

  const role = values.role

  if (role !== "admin" && role !== "editor") {
    throw new Error("El rol debe ser `admin` o `editor`.")
  }

  let password = process.env.ADMIN_PASSWORD

  if (!password) {
    password = await promptHidden(`Contraseña (mínimo ${MIN_PASSWORD_LENGTH} caracteres): `)
    const confirmation = await promptHidden("Repite la contraseña: ")

    if (password !== confirmation) {
      throw new Error("Las contraseñas no coinciden.")
    }
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`)
  }

  if (remote) {
    assertWranglerAuthenticated()
  }

  const pepper = process.env.AUTH_PEPPER

  if (!pepper || pepper.length < 32) {
    throw new Error(
      remote
        ? "Define AUTH_PEPPER con el mismo valor del secret del Worker antes de usar --remote."
        : "Falta AUTH_PEPPER en .dev.vars. Genera uno con `node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"`.",
    )
  }

  console.log("Generando hash de contraseña...")
  const passwordHash = await hashPassword(password, pepper)
  const timestamp = nowIso()
  const id = newId()

  const sql = `INSERT INTO users (
  id, email, name, password_hash, role, is_active, created_at, updated_at
) VALUES (
  ${sqlString(id)},
  ${sqlString(email)},
  ${sqlString(name)},
  ${sqlString(passwordHash)},
  ${sqlString(role)},
  1,
  ${sqlString(timestamp)},
  ${sqlString(timestamp)}
);
`

  const sqlPath = join(tmpdir(), `blog-manager-admin-${randomUUID()}.sql`)
  writeFileSync(sqlPath, sql, "utf8")

  try {
    const result = runWrangler([
      "d1",
      "execute",
      DB_NAME,
      remote ? "--remote" : "--local",
      "--file",
      sqlPath,
    ])

    if (result.status !== 0) {
      const outputText = `${result.stdout}\n${result.stderr}`

      if (/UNIQUE constraint failed/i.test(outputText)) {
        throw new Error("Ya existe un usuario con ese email.")
      }

      if (/no such table/i.test(outputText)) {
        throw new Error(
          "La tabla `users` no existe. Aplica las migraciones locales o remotas antes de crear el administrador.",
        )
      }

      throw new Error(`No se pudo crear el usuario.\n${outputText.trim()}`)
    }
  } finally {
    unlinkSync(sqlPath)
  }

  console.log(`\n✓ Usuario creado: ${email} (${role})`)
  console.log(`  D1: ${remote ? "remota" : "local"}`)
}

main().catch((error: unknown) => {
  console.error(`\n✖ ${error instanceof Error ? error.message : "Error desconocido"}`)
  console.error(`\n${usage()}\n`)
  process.exitCode = 1
})
