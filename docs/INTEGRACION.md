# Manual de integración — API pública

Esta guía explica cómo consumir la API pública de Blog Manager desde una página web: qué endpoints existen, qué datos devuelven, cómo renderizarlos con estilos propios y qué usos están permitidos o quedan fuera del contrato.

La API pública es **de solo lectura, sin autenticación y con CORS por blog**. Está pensada para que cada web muestre el contenido de su blog con su propio diseño, sin acoplarse al panel de administración.

- [1. Requisitos previos](#1-requisitos-previos)
- [2. Base URL y versionado](#2-base-url-y-versionado)
- [3. Modelo de datos](#3-modelo-de-datos)
- [4. Endpoints](#4-endpoints)
- [5. Reglas de visibilidad](#5-reglas-de-visibilidad)
- [6. Contrato del HTML del artículo](#6-contrato-del-html-del-artículo)
- [7. Renderizar con estilos propios](#7-renderizar-con-estilos-propios)
- [8. Imágenes y vídeos](#8-imágenes-y-vídeos)
- [9. Paginación](#9-paginación)
- [10. Caché y actualización del contenido](#10-caché-y-actualización-del-contenido)
- [11. CORS](#11-cors)
- [12. Errores](#12-errores)
- [13. Qué se puede hacer con los datos](#13-qué-se-puede-hacer-con-los-datos)
- [14. Qué no se puede hacer](#14-qué-no-se-puede-hacer)
- [15. Limitaciones actuales](#15-limitaciones-actuales)
- [16. Buenas prácticas](#16-buenas-prácticas)
- [17. Checklist de integración](#17-checklist-de-integración)
- [18. Ejemplo completo](#18-ejemplo-completo)

---

## 1. Requisitos previos

Antes de integrar una página:

1. El blog debe existir en el panel y estar **activo**.
2. Debes conocer su **slug** (por ejemplo `pagina-a`). Aparece en `/blogs` y en los ajustes del blog.
3. El **origen de la página** debe estar permitido:
   - el origen de `siteUrl` se permite siempre;
   - los orígenes adicionales se configuran en `allowedOrigins` del blog.

Ejemplo: si la web está en `https://www.pagina-a.com`, el origen es `https://www.pagina-a.com` (sin ruta y sin barra final). Si la web se sirve desde otro dominio, añádelo en los ajustes del blog.

> El blog y los artículos deben estar publicados. Los borradores, ocultos y blogs inactivos no se sirven por esta API.

---

## 2. Base URL y versionado

La API pública vive bajo `/api/public/v1`:

```text
https://blog-manager.dennis14756.workers.dev/api/public/v1
```

En local, con `npm run dev`:

```text
http://localhost:5173/api/public/v1
```

La versión (`v1`) forma parte de la ruta. Los cambios compatibles (añadir campos nuevos) pueden llegar sin subir de versión; los consumidores deben **ignorar los campos que no conozcan** y no asumir que el conjunto de campos es cerrado.

---

## 3. Modelo de datos

### Blog público

| Campo | Tipo | Descripción |
|---|---|---|
| `name` | string | Nombre visible del blog |
| `slug` | string | Identificador URL del blog |
| `description` | string | Descripción del blog (puede estar vacía) |
| `siteUrl` | string | URL del sitio asociado |

### Artículo en listados

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador interno estable |
| `title` | string | Título |
| `slug` | string | Slug único dentro del blog |
| `excerpt` | string | Descripción corta; puede estar vacía |
| `coverImage` | string \| null | URL absoluta de la portada |
| `author` | string | Autor visible |
| `status` | `published` \| `featured` | Estado público del artículo |
| `createdAt` | ISO 8601 | Fecha de creación |
| `publishedAt` | ISO 8601 \| null | Fecha de publicación; en artículos públicos siempre tiene valor |
| `updatedAt` | ISO 8601 | Última modificación |

### Artículo completo

Incluye todos los campos del listado más:

| Campo | Tipo | Descripción |
|---|---|---|
| `body` | string (HTML) | Contenido renderizado y sanitizado por el servidor |
| `blog` | objeto | `{ name, slug, siteUrl }` del blog al que pertenece |

`bodyJson` (el documento Tiptap) **no se expone públicamente**. La API entrega HTML listo para insertar.

---

## 4. Endpoints

Todos son `GET`. No requieren cookies ni cabeceras especiales.

### 4.1. Metadatos del blog

```http
GET /api/public/v1/blogs/:blogSlug
```

```json
{
  "data": {
    "name": "Blog de la Página A",
    "slug": "pagina-a",
    "description": "Noticias, guías y artículos de la Página A.",
    "siteUrl": "https://pagina-a.example"
  }
}
```

### 4.2. Listado de artículos

```http
GET /api/public/v1/blogs/:blogSlug/articles?limit=10&cursor=<opaco>&featured=true
```

| Parámetro | Valores | Por defecto | Descripción |
|---|---|---|---|
| `limit` | 1–50 | 10 | Artículos por página |
| `cursor` | string opaco | — | Cursor devuelto en `meta.nextCursor` |
| `featured` | `true` / `false` | — | `true` filtra solo destacados |

```json
{
  "data": [
    {
      "id": "5e6f...",
      "title": "Cómo empezar",
      "slug": "como-empezar",
      "excerpt": "Una introducción breve.",
      "coverImage": "https://blog-manager.dennis14756.workers.dev/media/<blogId>/<uuid>.webp",
      "author": "Daniel",
      "status": "featured",
      "createdAt": "2026-11-03T10:00:00.000Z",
      "publishedAt": "2026-11-12T10:00:00.000Z",
      "updatedAt": "2026-11-12T10:00:00.000Z"
    }
  ],
  "meta": {
    "nextCursor": "eyJwdWJsaXNoZWRBdCI6..."
  }
}
```

- Orden: `publishedAt` descendente y, en empate, `id` descendente.
- `meta.nextCursor` es `null` cuando no hay más páginas.
- El cursor es **opaco**: no lo construyas, no lo interpretes y no lo modifiques. Pásalo tal cual.

### 4.3. Detalle de un artículo

```http
GET /api/public/v1/blogs/:blogSlug/articles/:articleSlug
```

```json
{
  "data": {
    "id": "5e6f...",
    "title": "Cómo empezar",
    "slug": "como-empezar",
    "excerpt": "Una introducción breve.",
    "coverImage": "https://blog-manager.dennis14756.workers.dev/media/<blogId>/<uuid>.webp",
    "author": "Daniel",
    "status": "published",
    "createdAt": "2026-11-03T10:00:00.000Z",
    "publishedAt": "2026-11-12T10:00:00.000Z",
    "updatedAt": "2026-11-12T10:00:00.000Z",
    "body": "<h2>Introducción</h2><p>Texto con <strong>formato</strong>.</p>",
    "blog": {
      "name": "Blog de la Página A",
      "slug": "pagina-a",
      "siteUrl": "https://pagina-a.example"
    }
  }
}
```

Un artículo de otro blog bajo el slug de este responde `404`, igual que un slug inexistente. No se revela si el artículo existe en otro blog.

### 4.4. Preflight CORS

La API responde a `OPTIONS` en los tres endpoints con `204` y las cabeceras CORS correspondientes cuando el origen está permitido. Los navegadores lo hacen automáticamente.

---

## 5. Reglas de visibilidad

La API pública solo devuelve:

- blogs con `is_active = true`;
- artículos con estado `published` o `featured`;
- artículos con `publishedAt` informado.

Nunca devuelve:

- artículos `draft` o `hidden`;
- blogs inactivos;
- artículos publicados sin fecha de publicación;
- usuarios, sesiones, permisos ni estadísticas.

El campo `status` se incluye para que la web pueda destacar los `featured`. Un artículo `featured` es visible igual que uno `published`.

---

## 6. Contrato del HTML del artículo

El campo `body` lo genera el servidor con una lista blanca de nodos y marcas. No contiene scripts, `iframe`, hojas de estilo ni manejadores de eventos.

### 6.1. Etiquetas permitidas

| Etiqueta | Uso | Atributos |
|---|---|---|
| `p` | Párrafo | `style="text-align: …"` |
| `h1`, `h2`, `h3` | Títulos | `style="text-align: …"` |
| `ul`, `ol`, `li` | Listas | `start` en `ol` |
| `blockquote` | Cita | — |
| `pre > code` | Bloque de código | `class="language-<lenguaje>"` si se indicó |
| `hr` | Separador | — |
| `br` | Salto de línea | — |
| `strong`, `em`, `u`, `s` | Negrita, cursiva, subrayado, tachado | — |
| `code` | Código inline | — |
| `mark` | Resaltado | `style="background-color: …"` |
| `span` | Estilos de texto | `style` con `color`, `font-family`, `font-size` y `background-color` |
| `a` | Enlace | `href`, `target="_blank"`, `rel="noopener noreferrer"` |
| `img` | Imagen | `src`, `alt`, `title` |
| `video` | Vídeo | `controls`, `playsinline`, `preload="metadata"`, `style="max-width: 100%; height: auto"`, `src`, `title` |

Alineaciones permitidas: `left`, `center`, `right`, `justify`.

### 6.2. Qué no aparece nunca

- `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`, `<form>`.
- Atributos `on*` (`onclick`, `onerror`, etc.).
- URLs `javascript:`.
- Clases o identificadores arbitrarios.
- HTML introducido por el usuario sin escapar: el texto se escapa y se reconstruye.

Por eso `body` se puede insertar directamente en el DOM. Aun así, si tu framework lo permite, es recomendable hacerlo en un contenedor aislado y con el resto de la página bajo tu control.

### 6.3. Estilos inline

El editor permite aplicar formato al texto. Eso se traduce en estilos inline controlados:

- `p` y `h1`–`h3` pueden llevar `text-align`;
- `span` puede llevar `color`, `font-family`, `font-size` y `background-color`;
- `mark` puede llevar `background-color`;
- `video` lleva un `max-width: 100%; height: auto` para no desbordar.

Los valores se validan (colores, tamaños y familias con formato seguro). No se admiten expresiones arbitrarias de CSS.

### 6.4. Fuentes

Si el contenido usa una familia como `font-family: Lora, Georgia, serif`, la página debe cargar esa fuente para verla igual que en el editor. Si no se carga, el navegador usa el fallback (`Georgia, serif`). Las fuentes del catálogo son Google Fonts; puedes cargarlas con `<link>` o con tu sistema habitual.

---

## 7. Renderizar con estilos propios

### 7.1. Qué controla cada parte

| La API aporta | Tu web aporta |
|---|---|
| Título, slug, extracto, autor y fechas | Layout, tarjetas, grid, navegación |
| Portada (URL) | Tamaño, recorte, relación de aspecto, lazy loading |
| `body` HTML semántico | Ancho de lectura, tipografía base, colores, espaciado |
| Estilos inline del formato del editor | El resto de la hoja de estilos |
| URLs de imágenes y vídeos | Presentación, `border-radius`, sombras, etc. |

### 7.2. Reglas de seguridad al renderizar

- **`body` es HTML seguro**: puedes insertarlo con `innerHTML` o el equivalente de tu framework.
- **El resto de campos son texto plano**: `title`, `excerpt`, `author`, `slug`… Debes escaparlos si construyes HTML concatenando cadenas. No los insertes como HTML crudo.
- No necesitas volver a sanitizar `body`, pero tampoco debes mezclarlo con HTML generado a partir de texto sin escapar.
- No ejecutes el contenido como JavaScript ni lo evalúes.

Ejemplo correcto con `textContent`:

```js
const title = document.createElement("h1")
title.textContent = article.title
```

Ejemplo incorrecto:

```js
// XSS si title contuviera HTML
container.innerHTML = `<h1>${article.title}</h1>`
```

### 7.3. CSS recomendado

Puedes envolver el contenido en una clase propia y estilizar las etiquetas del contrato:

```css
.post-body {
  max-width: 68ch;
  line-height: 1.75;
  color: #1f2937;
}

.post-body h1,
.post-body h2,
.post-body h3 {
  line-height: 1.2;
  margin: 2rem 0 0.75rem;
}

.post-body p {
  margin: 0 0 1rem;
}

.post-body a {
  color: #2563eb;
  text-decoration: underline;
}

.post-body img,
.post-body video {
  max-width: 100%;
  height: auto;
  border-radius: 12px;
}

.post-body blockquote {
  margin: 1.5rem 0;
  padding-left: 1rem;
  border-left: 3px solid #d1d5db;
  color: #4b5563;
}

.post-body pre {
  overflow-x: auto;
  padding: 1rem;
  border-radius: 12px;
  background: #111827;
  color: #f9fafb;
}
```

Los estilos inline del editor (color, fuente, tamaño, alineación) tienen prioridad sobre tu CSS para esas propiedades concretas. Si necesitas imponer tu diseño por encima de ellos:

- usa selectores más específicos o `!important` en las propiedades que quieras forzar;
- o evita esas opciones de formato al crear el contenido.

### 7.4. Ejemplo mínimo en React

```tsx
function Article({ article }: { article: PublicArticle }) {
  return (
    <article className="post">
      <header>
        <h1>{article.title}</h1>
        <p>{article.excerpt}</p>
        <p>
          {article.author} ·{" "}
          <time dateTime={article.publishedAt ?? undefined}>
            {new Date(article.publishedAt ?? article.updatedAt).toLocaleDateString("es")}
          </time>
        </p>
      </header>

      {article.coverImage ? <img src={article.coverImage} alt="" /> : null}

      {/* El HTML lo genera y sanitiza el servidor. */}
      <div className="post-body" dangerouslySetInnerHTML={{ __html: article.body }} />
    </article>
  )
}
```

---

## 8. Imágenes y vídeos

- Formato de imagen: **WebP**. Formato de vídeo: **WebM**.
- Las URLs son absolutas y apuntan al Worker: `/media/:blogId/:filename`.
- Puedes usarlas directamente en `src` de `img` o `video`; no necesitas proxy.
- Caché de medios: `Cache-Control: public, max-age=31536000, immutable`, con `ETag` y `304` condicional. Las imágenes se cachean en el Worker (Cache API), de modo que las peticiones repetidas no vuelven a leer el almacenamiento.
- Los vídeos admiten `Range`: se pueden reproducir y buscar sin descargar el archivo completo. Las respuestas con `Range` no se cachean.
- Usa siempre las URLs que devuelve la API. No construyas ni reescribas las rutas de medios.
- `coverImage` puede ser `null`; muestra un placeholder o simplemente omite la imagen.

---

## 9. Paginación

El listado usa cursor, no número de página:

```js
async function loadAllArticles(api, blogSlug) {
  const articles = []
  let cursor = null

  do {
    const params = new URLSearchParams({ limit: "50" })
    if (cursor) params.set("cursor", cursor)

    const response = await fetch(`${api}/blogs/${blogSlug}/articles?${params}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const { data, meta } = await response.json()
    articles.push(...data)
    cursor = meta.nextCursor
  } while (cursor)

  return articles
}
```

Recomendaciones:

- No pidas `limit` mayor de 50.
- No reutilices un cursor de otro blog ni de otro filtro.
- Trata el cursor como una cadena opaca.
- Para listados grandes, pagina de forma perezosa (botón «Cargar más» o scroll) en lugar de descargar todo de golpe.

---

## 10. Caché y actualización del contenido

### API JSON

- `Cache-Control: public, max-age=60, stale-while-revalidate=300`.
- No se emite `ETag` para el JSON público.
- Un cambio publicado puede tardar **hasta ~60 segundos** en reflejarse por la caché; durante la ventana de `stale-while-revalidate` puede servirse la versión anterior mientras se revalida.

### Medios

- Caché de un año e inmutable. Las URLs incluyen un UUID, así que una imagen reemplazada tendrá otra URL.

### Recomendaciones

- Cachea las respuestas en tu web/CDN si tienes mucho tráfico.
- No hagas polling agresivo por artículo. Si necesitas detectar cambios, consulta el listado con una frecuencia razonable y compara `updatedAt`.
- Para construir sitemaps o páginas estáticas, usa SSR/SSG y regenera cuando publiques.

---

## 11. CORS

La API aplica CORS **por blog**:

- Se permite el origen de `siteUrl` y los orígenes de `allowedOrigins`.
- Si el `Origin` de la petición está permitido, la respuesta incluye:
  - `Access-Control-Allow-Origin: <origen>` (se refleja el origen, no `*`);
  - `Access-Control-Allow-Methods: GET, OPTIONS`;
  - `Access-Control-Allow-Headers: Content-Type`;
  - `Access-Control-Max-Age: 86400`;
  - `Vary: Origin`.
- No se usan credenciales (`cookies`/`Authorization`), así que no necesitas `credentials: "include"`.
- Si el origen no está permitido, **la petición puede responder `200` en el servidor**, pero el navegador bloquea la lectura porque falta `Access-Control-Allow-Origin`. No es un fallo de la API: es la política CORS.

Notas:

- Cambiar de dominio (por ejemplo, de `https://pagina-a.com` a `https://www.pagina-a.com`) requiere actualizar `siteUrl` o `allowedOrigins`.
- Las peticiones desde servidor (SSR, build, scripts de Node) no están sujetas a CORS. Aun así, respeta las condiciones de uso.

---

## 12. Errores

Formato uniforme:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Blog no encontrado",
    "requestId": "..."
  }
}
```

| HTTP | Código | Cuándo |
|---|---|---|
| `400` | `VALIDATION_ERROR` | `limit` fuera de 1–50, `featured` no booleano, parámetros inválidos |
| `400` | `INVALID_CURSOR` | Cursor corrupto o manipulado |
| `404` | `NOT_FOUND` | Blog inactivo/inexistente o artículo no visible |
| `429` | `RATE_LIMITED` | Más de 120 peticiones por minuto desde tu IP (ver §12.1) |
| `500` | `INTERNAL` | Error interno; incluye `requestId` para soporte |

Recomendaciones:

- Trata `404` como «no existe o no es visible», sin distinguir.
- No reintentes automáticamente un `400`.
- Ante un `429`, espera el tiempo de `Retry-After` (60 s) antes de volver a llamar.
- Para `5xx`, aplica reintentos con backoff exponencial y un límite.
- Guarda el `requestId` si necesitas reportar un problema.

### 12.1. Límite de peticiones

La API pública permite **120 peticiones por minuto por IP** y los medios **300 por minuto**. Una web con tráfico normal no debería alcanzarlo si cachea las respuestas. Para evitarlo:

- cachea el listado y los detalles en tu servidor o CDN en lugar de pedirlos en cada visita;
- reutiliza las URLs de medios: el navegador las cachea un año;
- no hagas polling de todos los artículos; consulta el listado con una frecuencia razonable.

Si tu sitio provoca `429` de forma legítima, avisa al administrador del panel para revisar el límite.

---

## 13. Qué se puede hacer con los datos

Sí puedes:

- Mostrar los blogs y artículos en tus páginas con el diseño, layout y componentes que quieras.
- Construir listados, tarjetas, páginas de detalle, relacionados, búsquedas locales sobre los datos descargados y sitemaps.
- Usar `excerpt` como resumen y `coverImage` como miniatura.
- Aplicar tu propia tipografía, colores, espaciados y estilos sobre el HTML servido.
- Insertar `body` directamente (ya viene sanitizado).
- Cachear las respuestas y los medios.
- Usar los medios en `img`/`video`, con reproducción y búsqueda por `Range`.
- Renderizar en cliente, SSR o SSG (Astro, Next, WordPress, una landing estática, etc.).
- Indexar el contenido en buscadores si lo sirves renderizado en el servidor.

---

## 14. Qué no se puede hacer

La API no lo permite técnicamente o queda fuera del contrato:

- **No puedes leer borradores, ocultos ni blogs inactivos.** No hay endpoint de preview pública.
- **No puedes acceder a la API de administración** (`/api/admin/*`), ni a usuarios, sesiones, permisos o estadísticas.
- **No puedes modificar contenido, crear artículos ni subir medios.** La API pública es solo `GET`/`OPTIONS`.
- **No puedes obtener `bodyJson` ni el documento Tiptap estructurado.** Solo se sirve HTML.
- **No puedes saltarte CORS desde el navegador** con un origen no permitido. El servidor puede devolver el JSON a un cliente que no sea un navegador, pero eso no convierte la API en privada.
- **No puedes usar la API para buscar por texto, filtrar por etiquetas/categorías ni recibir webhooks.** Esas funciones no existen todavía.
- **No construyas URLs de medios a mano.** Usa las URLs devueltas.
- **No asumas que los campos son inmutables para siempre.** Se pueden añadir campos compatibles; ignora los desconocidos.
- **No hagas scraping abusivo ni polling de alta frecuencia.** Usa caché, paginación y límites razonables.
- **No presentes el contenido como propio si no tienes autorización.** La API es pública, pero el contenido pertenece al blog y su autor; la web consumidora debe contar con permiso de su propietario.

> CORS no es autenticación. Cualquier cliente que no sea un navegador puede leer un blog público si conoce su slug. No publiques información sensible en un blog público.

---

## 15. Limitaciones actuales

- No hay búsqueda pública: filtra en cliente sobre los artículos descargados.
- No hay endpoint de etiquetas, categorías ni autores.
- No hay `bodyJson` público ni render por bloques.
- No hay preview de borradores.
- No hay webhooks ni feed de cambios; puedes comparar `updatedAt` del listado.
- No hay API keys: todo blog activo es público.
- El listado público no permite ordenar por otro criterio distinto de `publishedAt` descendente.
- No se sirven artículos sin `publishedAt`, aunque su estado sea visible.

---

## 16. Buenas prácticas

- Escapa siempre `title`, `excerpt`, `author` y `slug` al construir HTML.
- Inserta `body` solo en un contenedor dedicado y con estilos acotados (`.post-body`).
- Usa `loading="lazy"` y `decoding="async"` en portadas e imágenes del contenido cuando aplique.
- Añade `width`/`height` o una relación de aspecto fija a las portadas para evitar saltos de layout.
- No muestres `coverImage` si es `null`; usa un placeholder consistente.
- Cachea el listado y los medios; no consultes la API en cada visita si no cambia.
- Respeta `nextCursor` y no pidas páginas de más de 50 artículos.
- Si usas SSR/SSG, genera metadatos (`<title>`, `description`, Open Graph) a partir de `title`, `excerpt` y `coverImage`.
- Si usas el HTML en un editor o transformador posterior, no elimines la sanitización ni inyectes HTML de otras fuentes.

---

## 17. Checklist de integración

- [ ] El blog está activo y tiene slug.
- [ ] El origen de la web está en `siteUrl` o `allowedOrigins`.
- [ ] La web llama a `/api/public/v1/...` y no a `/api/admin/...`.
- [ ] El listado usa `limit` ≤ 50 y sigue `meta.nextCursor`.
- [ ] Los campos de texto se escapan; `body` se inserta como HTML seguro.
- [ ] `coverImage` se trata como opcional.
- [ ] Las URLs de medios se usan tal cual, sin reconstruirlas.
- [ ] Los errores `404` se tratan como contenido no disponible.
- [ ] Se respeta la caché (no polling agresivo).
- [ ] Se ha probado el render con un artículo con imágenes, vídeo, listas, cita y código.
- [ ] Se ha probado en móvil y con la fuente del contenido cargada o con fallback.

---

## 18. Ejemplo completo

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Blog de la Página A</title>
    <style>
      body {
        margin: 0;
        font-family: system-ui, sans-serif;
        background: #f8fafc;
        color: #0f172a;
      }
      main {
        max-width: 960px;
        margin: 0 auto;
        padding: 2rem 1rem 4rem;
      }
      .posts {
        display: grid;
        gap: 1.5rem;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      }
      .card {
        overflow: hidden;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        background: #fff;
      }
      .card img {
        display: block;
        width: 100%;
        aspect-ratio: 16 / 9;
        object-fit: cover;
      }
      .card-body {
        padding: 1rem;
      }
      .card h2 {
        margin: 0 0 0.5rem;
        font-size: 1.1rem;
      }
      .card h2 a {
        color: inherit;
        text-decoration: none;
      }
      .meta {
        font-size: 0.8rem;
        color: #64748b;
      }
      .post-body {
        max-width: 70ch;
        line-height: 1.75;
      }
      .post-body img,
      .post-body video {
        max-width: 100%;
        height: auto;
        border-radius: 12px;
      }
      .post-body pre {
        overflow-x: auto;
        padding: 1rem;
        border-radius: 12px;
        background: #0f172a;
        color: #e2e8f0;
      }
      .post-body blockquote {
        margin: 1.5rem 0;
        padding-left: 1rem;
        border-left: 3px solid #cbd5e1;
        color: #475569;
      }
    </style>
  </head>
  <body>
    <main>
      <section id="list-view">
        <h1>Últimos artículos</h1>
        <div id="posts" class="posts"></div>
      </section>

      <article id="detail-view" hidden>
        <a href="#" id="back">← Volver</a>
        <h1 id="article-title"></h1>
        <p class="meta" id="article-meta"></p>
        <img id="article-cover" alt="" hidden />
        <div id="article-body" class="post-body"></div>
      </article>
    </main>

    <script>
      const API = "https://blog-manager.dennis14756.workers.dev/api/public/v1"
      const BLOG = "pagina-a"

      const listView = document.querySelector("#list-view")
      const detailView = document.querySelector("#detail-view")
      const posts = document.querySelector("#posts")

      function formatDate(value) {
        if (!value) return ""
        return new Date(value).toLocaleDateString("es", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      }

      function renderCard(article) {
        const card = document.createElement("article")
        card.className = "card"

        if (article.coverImage) {
          const img = document.createElement("img")
          img.src = article.coverImage
          img.alt = ""
          img.loading = "lazy"
          card.append(img)
        }

        const body = document.createElement("div")
        body.className = "card-body"

        const title = document.createElement("h2")
        const link = document.createElement("a")
        link.href = `?post=${encodeURIComponent(article.slug)}`
        link.textContent = article.title
        title.append(link)

        const excerpt = document.createElement("p")
        excerpt.textContent = article.excerpt

        const meta = document.createElement("p")
        meta.className = "meta"
        meta.textContent = `${article.author} · ${formatDate(article.publishedAt)}`

        body.append(title, excerpt, meta)
        card.append(body)

        return card
      }

      async function loadList() {
        const response = await fetch(`${API}/blogs/${BLOG}/articles?limit=12`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const { data } = await response.json()

        posts.replaceChildren(...data.map(renderCard))
      }

      async function loadArticle(slug) {
        const response = await fetch(
          `${API}/blogs/${BLOG}/articles/${encodeURIComponent(slug)}`,
        )
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const { data: article } = await response.json()

        document.title = `${article.title} · Blog de la Página A`
        document.querySelector("#article-title").textContent = article.title
        document.querySelector("#article-meta").textContent =
          `${article.author} · ${formatDate(article.publishedAt)}`

        const cover = document.querySelector("#article-cover")
        if (article.coverImage) {
          cover.src = article.coverImage
          cover.hidden = false
        } else {
          cover.hidden = true
        }

        // HTML ya sanitizado por el servidor.
        document.querySelector("#article-body").innerHTML = article.body

        listView.hidden = true
        detailView.hidden = false
      }

      document.querySelector("#back").addEventListener("click", (event) => {
        event.preventDefault()
        history.replaceState(null, "", location.pathname)
        detailView.hidden = true
        listView.hidden = false

        if (posts.childElementCount === 0) {
          loadList().catch((error) => console.error(error))
        }
      })

      const slug = new URLSearchParams(location.search).get("post")
      if (slug) {
        loadArticle(slug).catch(() => loadList())
      } else {
        loadList().catch((error) => {
          posts.textContent = "No se pudo cargar el blog."
          console.error(error)
        })
      }
    </script>
  </body>
</html>
```

---

Si el blog está activo, el origen permitido y el contenido publicado, esta integración funciona sin autenticación y sin tocar el panel de administración.
