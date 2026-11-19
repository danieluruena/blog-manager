# Rendimiento — Blog Manager

Mediciones tomadas con el build de producción (`npm run build`) y D1 local
(`EXPLAIN QUERY PLAN`).

## Bundle del cliente

Chunks principales:

| Chunk                          | Tamaño    | Gzip      | Cuándo se carga            |
| ------------------------------ | --------- | --------- | -------------------------- |
| `mdx-editor-*.js`              | 747.95 kB | 234.06 kB | Solo al abrir el editor    |
| `index-*.js`                   | 276.16 kB | 86.13 kB  | Entrada de la SPA          |
| `dist-CvhAxO17.js`             | 316.16 kB | 102.54 kB | Vendor compartido          |
| `button-*.js`                  | 146.12 kB | 47.27 kB  | Componentes UI             |
| `dist-DW24tMXg.js`             | 103.89 kB | 34.75 kB  | Vendor compartido          |
| `form-*.js`                    | 45.51 kB  | 15.66 kB  | Formularios                |

Notas:

- El editor (MDXEditor + CodeMirror) está **fuera del bundle inicial**: se
  descarga con `import()` al abrir `/blogs/:blogId/articles/new` o `/:articleId`.
- No hay código de servidor en el cliente: no aparecen `AUTH_PEPPER`,
  `drizzle-orm` ni `D1Database` en `dist/client/assets/*.js`.
- El aviso de Vite por el chunk >500 kB es esperado y aceptado: es el editor
  cargado bajo demanda, no la ruta crítica.

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
