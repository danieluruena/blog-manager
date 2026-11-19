# API — Blog Manager

> **Base local:** `http://localhost:5173`
> **Base producción:** `https://<worker>.workers.dev`
> **Formato:** JSON UTF-8
> **Fechas:** ISO 8601 UTC

La API se divide en tres zonas:

| Zona           | Prefijo          | Autenticación                            |
| -------------- | ---------------- | ---------------------------------------- |
| Autenticación  | `/api/auth`      | Pública para login; cookie para el resto |
| Administración | `/api/admin`     | Cookie de sesión                         |
| Medios         | `/media`         | Sin autenticación, con caché larga       |
| Pública        | `/api/public/v1` | Sin autenticación, con CORS por blog     |

## Respuestas

Las respuestas correctas usan un envelope `data`:

```json
{
  "data": {}
}
```

Los listados añaden `meta`:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 0
  }
}
```

Los errores tienen esta forma:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos inválidos",
    "details": [],
    "requestId": "..."
  }
}
```

Códigos principales: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `SLUG_DUPLICADO`, `BLOG_HAS_ARTICLES`, `RATE_LIMITED`, `INVALID_CREDENTIALS`, `INVALID_CURSOR`, `INTERNAL`.

---

## Autenticación

### `POST /api/auth/login`

```json
{
  "email": "admin@example.com",
  "password": "una-contraseña-larga"
}
```

Respuesta `200`:

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@example.com",
      "name": "Admin",
      "role": "admin"
    },
    "expiresAt": "2026-11-25T10:00:00.000Z"
  }
}
```

La sesión se guarda en una cookie `bm_session`:

- `HttpOnly`
- `SameSite=Strict`
- `Secure` cuando la petición es HTTPS
- 7 días de duración

Límite de intentos: 5 fallos por IP y 5 por email en 15 minutos. Al superarlo se responde `429` con `Retry-After`.

### `GET /api/auth/me`

Requiere cookie. Devuelve el usuario actual.

### `POST /api/auth/logout`

Cierra la sesión actual y borra la cookie. Responde `204`.

### `PATCH /api/auth/password`

```json
{
  "currentPassword": "contraseña-actual",
  "newPassword": "contraseña-nueva-larga"
}
```

Cambia la contraseña, revoca todas las sesiones del usuario y borra la cookie. Responde `204`.

### Ejemplo con curl

```bash
curl -i -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"una-contraseña-larga"}' \
  http://localhost:5173/api/auth/login

curl -b cookies.txt http://localhost:5173/api/auth/me
```

---

## Administración

Todas las rutas de administración requieren cookie de sesión. Los roles son:

- `admin`: todo, incluida la gestión de blogs.
- `editor`: puede gestionar artículos de cualquier blog, pero no crear, editar ni borrar blogs.

### Blogs

| Método   | Ruta                       | Rol         | Descripción                             |
| -------- | -------------------------- | ----------- | --------------------------------------- |
| `GET`    | `/api/admin/blogs`         | autenticado | Lista con búsqueda, filtro y paginación |
| `POST`   | `/api/admin/blogs`         | admin       | Crea un blog                            |
| `GET`    | `/api/admin/blogs/:blogId` | autenticado | Detalle + `articleCount`                |
| `PATCH`  | `/api/admin/blogs/:blogId` | admin       | Actualiza campos parciales              |
| `DELETE` | `/api/admin/blogs/:blogId` | admin       | Elimina solo si no tiene artículos      |

Query params de `GET /api/admin/blogs`:

- `q`: búsqueda por nombre o slug.
- `active`: `true` o `false`.
- `page`: por defecto `1`.
- `pageSize`: por defecto `20`, máximo `100`.
- `sort`: `name`, `updated_at` o `created_at`.

Crear blog:

```json
{
  "name": "Blog de la Página A",
  "slug": "pagina-a",
  "description": "Noticias de la Página A",
  "siteUrl": "https://pagina-a.com",
  "allowedOrigins": ["https://www.pagina-a.com"],
  "isActive": true
}
```

`slug` es opcional; si no se envía, se genera desde `name`. Si el slug ya existe, responde `409 SLUG_DUPLICADO`.

`allowedOrigins` es un array de orígenes CORS. El origen de `siteUrl` se permite siempre.

Borrado bloqueado:

```json
{
  "error": {
    "code": "BLOG_HAS_ARTICLES",
    "message": "No se puede eliminar un blog con artículos. Desactívalo o elimina sus artículos primero.",
    "details": {
      "articleCount": 12
    },
    "requestId": "..."
  }
}
```

### Artículos

Todos los artículos están anidados bajo un blog:

| Método   | Ruta                                           | Descripción                    |
| -------- | ---------------------------------------------- | ------------------------------ |
| `GET`    | `/api/admin/blogs/:blogId/articles`            | Lista con filtros y paginación |
| `POST`   | `/api/admin/blogs/:blogId/articles`            | Crea un artículo               |
| `GET`    | `/api/admin/blogs/:blogId/articles/:articleId` | Detalle con `body`             |
| `PATCH`  | `/api/admin/blogs/:blogId/articles/:articleId` | Actualiza campos parciales     |
| `DELETE` | `/api/admin/blogs/:blogId/articles/:articleId` | Elimina el artículo            |

Query params de la lista:

- `q`: búsqueda por título, extracto o slug.
- `status`: `draft`, `published`, `hidden` o `featured`.
- `page`, `pageSize`.
- `sort`: `updated_at`, `published_at`, `created_at` o `title`.

Crear artículo:

```json
{
  "title": "Cómo empezar",
  "slug": "como-empezar",
  "excerpt": "Una introducción breve",
  "author": "Daniel",
  "body": "## Introducción\n\nTexto en **markdown**.",
  "status": "draft",
  "publishedAt": null
}
```

Reglas:

- `blogId` no se envía en el body: viene de la URL y es inmutable.
- El slug es único dentro del blog.
- Si se publica (`published` o `featured`) sin `publishedAt`, el servidor asigna la fecha actual.
- Un artículo de otro blog bajo la URL de este responde `404`, no `403`.

### Imágenes

| Método   | Ruta                                          | Descripción                        |
| -------- | --------------------------------------------- | ---------------------------------- |
| `POST`   | `/api/admin/blogs/:blogId/media`              | Sube una imagen (`multipart/form-data`, campo `file`) |
| `DELETE` | `/api/admin/blogs/:blogId/media/:mediaId`     | Elimina la imagen de D1 y R2 (solo admin) |
| `GET`    | `/media/:blogId/:filename`                    | Sirve la imagen con caché inmutable |

Límites y formatos:

- El endpoint acepta **solo `image/webp`**. El editor convierte JPEG, PNG, WebP y AVIF a WebP en el navegador antes de subirlos; los GIF animados no están soportados.
- Optimización en el cliente: lado mayor máximo **2560 px** y calidad **0.75**. La imagen de origen puede pesar hasta **20 MB**.
- Tamaño máximo del WebP subido: **5 MB**. Por encima responde `413 FILE_TOO_LARGE`.
- Se comprueban los bytes mágicos: si el contenido no es un WebP válido responde `415 INVALID_IMAGE`, y si no se declara como `image/webp`, `415 UNSUPPORTED_MEDIA_TYPE`.
- La respuesta incluye una URL absoluta (`url`) lista para insertar en markdown:

```json
{
  "data": {
    "id": "uuid",
    "blogId": "uuid",
    "filename": "uuid.webp",
    "mimeType": "image/webp",
    "sizeBytes": 12345,
    "url": "https://<worker>.workers.dev/media/<blogId>/<uuid>.webp",
    "createdAt": "2026-11-18T10:00:00.000Z"
  }
}
```

La entrega usa `Cache-Control: public, max-age=31536000, immutable`, `ETag` (responde `304` con `If-None-Match`), `Content-Type` del objeto y `X-Content-Type-Options: nosniff`.

Cada subida genera un objeto y una fila propios. Al guardar el artículo, las imágenes presentes en el markdown quedan asociadas a él; las que se han quitado se eliminan de R2 y D1. Una imagen pertenece a un único artículo: reutilizar la URL de otro artículo responde `409 MEDIA_IN_OTHER_ARTICLE`. Al eliminar un artículo se eliminan también sus imágenes, y al eliminar un blog sin artículos se limpian las que hayan quedado sin asignar.

### Estadísticas

`GET /api/admin/stats`

```json
{
  "data": {
    "totalBlogs": 2,
    "activeBlogs": 2,
    "totalArticles": 8,
    "publishedArticles": 4,
    "draftArticles": 2,
    "featuredArticles": 2,
    "recentArticles": []
  }
}
```

---

## API pública

No usa cookies. Solo devuelve blogs activos y artículos en estado `published` o `featured`.

| Método | Ruta                                                   | Descripción                        |
| ------ | ------------------------------------------------------ | ---------------------------------- |
| `GET`  | `/api/public/v1/blogs/:blogSlug`                       | Metadatos del blog                 |
| `GET`  | `/api/public/v1/blogs/:blogSlug/articles`              | Lista visible, paginada por cursor |
| `GET`  | `/api/public/v1/blogs/:blogSlug/articles/:articleSlug` | Detalle con `body`                 |

Query params de la lista:

- `limit`: 1–50, por defecto 10.
- `cursor`: cursor opaco devuelto en `meta.nextCursor`.
- `featured`: `true` para devolver solo destacados.

Ejemplo:

```bash
curl "http://localhost:5173/api/public/v1/blogs/pagina-a/articles?limit=10"
```

Respuesta:

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Guía rápida de markdown",
      "slug": "guia-rapida-markdown",
      "excerpt": "Los elementos de markdown que más vas a usar.",
      "author": "Daniel",
      "status": "featured",
      "createdAt": "2026-11-03T10:00:00.000Z",
      "publishedAt": "2026-11-12T10:00:00.000Z",
      "updatedAt": "2026-11-12T10:00:00.000Z"
    }
  ],
  "meta": {
    "nextCursor": null
  }
}
```

### CORS

El origen permitido se calcula con:

1. El origen de `siteUrl`.
2. Los orígenes de `allowedOrigins`.

Si el `Origin` de la petición coincide, se devuelve `Access-Control-Allow-Origin` con ese origen. Si no coincide, no se añade la cabecera y el navegador bloquea la lectura.

CORS no es una barrera de seguridad frente a clientes que no son navegadores: los artículos son públicos. Para restringir consumo por máquina haría falta una API key o un proxy server-side.

### Caché

Las respuestas públicas llevan:

```text
Cache-Control: public, max-age=60, stale-while-revalidate=300
Vary: Origin
```

---

## Ejemplos rápidos

Listar blogs (con sesión):

```bash
curl -b cookies.txt http://localhost:5173/api/admin/blogs
```

Crear un blog:

```bash
curl -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"Blog de prueba","siteUrl":"https://ejemplo.com"}' \
  http://localhost:5173/api/admin/blogs
```

Listar artículos públicos:

```bash
curl "http://localhost:5173/api/public/v1/blogs/pagina-a/articles"
```

Probar CORS:

```bash
curl -i -H "Origin: https://pagina-a.example" \
  "http://localhost:5173/api/public/v1/blogs/pagina-a/articles"
```
