import { readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"

import { generateJSON } from "@tiptap/html/server"
import { marked } from "marked"

import { articleExtensions } from "../src/shared/richtext"
import { renderArticleHtml } from "../src/server/lib/richtext"

const D1_DIR = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject"

type ArticleRow = {
  id: string
  title: string
  body: string | null
}

function findCurrentDatabase(): string {
  const files = readdirSync(D1_DIR).filter(
    (file) => file.endsWith(".sqlite") && file !== "metadata.sqlite",
  )
  const candidates: string[] = []

  for (const file of files) {
    const path = join(D1_DIR, file)
    const db = new DatabaseSync(path, { readOnly: true })

    try {
      const columns = db.prepare("PRAGMA table_info(articles)").all() as Array<{
        name: string
      }>

      if (columns.some((column) => column.name === "body_json")) {
        candidates.push(path)
      }
    } catch {
      // No es una base con la tabla de artículos.
    } finally {
      db.close()
    }
  }

  if (candidates.length === 0) {
    throw new Error("No se encontró la D1 local con la migración de body_json aplicada.")
  }

  return candidates.sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0]!
}

function main(): void {
  const path = findCurrentDatabase()
  const db = new DatabaseSync(path)
  const rows = db
    .prepare("SELECT id, title, body FROM articles WHERE body_json IS NULL OR body_json = ''")
    .all() as ArticleRow[]

  if (rows.length === 0) {
    console.log("No hay artículos pendientes de convertir.")
    db.close()
    return
  }

  const update = db.prepare("UPDATE articles SET body = ?, body_json = ? WHERE id = ?")
  let converted = 0

  for (const row of rows) {
    try {
      const html = marked.parse(row.body ?? "", {
        gfm: true,
        breaks: false,
      }) as string
      const document = generateJSON(html, articleExtensions)
      const bodyJson = JSON.stringify(document)
      const normalizedHtml = renderArticleHtml(bodyJson)

      update.run(normalizedHtml, bodyJson, row.id)
      converted += 1
      console.log(`✓ ${row.title}`)
    } catch (error) {
      console.error(`✖ ${row.title}: ${error instanceof Error ? error.message : error}`)
    }
  }

  db.close()
  console.log(`\nConvertidos ${converted} de ${rows.length} artículos.`)
}

main()
