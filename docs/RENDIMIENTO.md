# Rendimiento — Blog Manager

Mediciones tomadas con el build de producción (`npm run build`) y D1 local
(`EXPLAIN QUERY PLAN`).

## Bundle del cliente

Chunks principales:

| Chunk                          | Tamaño    | Gzip      | Cuándo se carga            |
| ------------------------------ | --------- | --------- | -------------------------- |
| `use-articles-*.js`            | 405.29 kB | 127.78 kB | Rutas de artículos y editor |
| `index-*.js`                   | 296.07 kB | 93.87 kB  | Entrada de la SPA          |
| `api-*.js`                     | 112.88 kB | 36.49 kB  | Cliente HTTP compartido    |
| `schemas-*.js`                 | 85.18 kB  | 24.56 kB  | Validación compartida      |
| `form-*.js`                    | 45.48 kB  | 15.64 kB  | Formularios                |
| `tiptap-editor-*.js`           | 48.57 kB  | 15.59 kB  | Solo al abrir el editor    |

Notas:

- El editor (Tiptap + ProseMirror) está **fuera del bundle inicial**: el
  componente se descarga con `import()` al abrir
  `/blogs/:blogId/articles/new` o `/:articleId`. El chunk `use-articles` agrupa
  la página de artículos y las dependencias compartidas del editor.
- No hay código de servidor en el cliente: no aparecen `AUTH_PEPPER`,
  `drizzle-orm` ni `D1Database` en `dist/client/assets/*.js`. El renderizador
  HTML (`src/server/lib/richtext.ts`) solo se ejecuta en el Worker.
- El build ya no genera el aviso de chunk >500 kB.

## Consultas D1

Comandos ejecutados:

```powershell
npx wrangler d1 execute blog-manager-db --local --command "EXPLAIN QUERY PLAN <sql>"
```

| Consulta                       | Plan                                                                 |
| ------------------------------ | -------------------------------------------------------------------- |
| Listado de blogs               | `SCAN blogs` (tabla pequeña) + `idx_articles_blog_created` + orden temporal |
| Artículos de un blog           | `idx_articles_blog_updated (blog_id=?)`                              |
| Artículos filtrados por estado | `idx_articles_blog_updated (blog_id=?)` + filtro `status`            |
| API pública (publicados)       | `idx_articles_blog_status_published (blog_id, status, published_at)` + orden temporal |
| Búsqueda de artículos          | `idx_articles_blog_updated (blog_id=?)` + `LIKE` sobre título/extracto/slug |
| Medios de un artículo          | `idx_media_article (article_id=?)`                                   |
| Sesión por token               | `sessions_token_hash_unique (token_hash=?)`                          |

Conclusiones:

- Todas las consultas de artículos están acotadas por `blog_id`, así que el
  coste crece con el contenido de un blog, no con el total del sistema.
- La búsqueda no usa índice de texto completo. Para blogs con miles de
  artículos convendría migrar a FTS5, pero para el tamaño actual es suficiente.
- La API pública ordena un subconjunto pequeño tras filtrar por los dos estados
  visibles; el `USE TEMP B-TREE` es aceptable con el `LIMIT` de 1–50.
- El listado de blogs escanea la tabla de blogs y ordena en memoria: es una
  tabla pequeña por diseño (un blog por web). No requiere cambios.
- Revisar índices si algún blog supera ~10.000 artículos o si la búsqueda pasa a
  ser una función principal.

## Recomendaciones futuras

- Añadir FTS5 si la búsqueda crece.
- Mantener el editor en carga diferida.
- Revisar el tamaño de los chunks de vendor si se añaden librerías grandes.
- Añadir caché de API pública por blog si el tráfico aumenta (ya existe
  `Cache-Control: max-age=60, stale-while-revalidate=300`).
