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

Códigos principales: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `SLUG_DUPLICADO`, `BLOG_HAS_ARTICLES`, `EMAIL_IN_USE`, `RATE_LIMITED`, `INVALID_CREDENTIALS`, `USER_PENDING_APPROVAL`, `APPROVAL_REQUIRES_PERMISSION`, `CANNOT_DELETE_SELF`, `CANNOT_DEACTIVATE_SELF`, `CANNOT_DEMOTE_SELF`, `LAST_ADMIN`, `INVALID_CURSOR`, `INTERNAL`.

---

## Autenticación

### `POST /api/auth/register`

Registro público. Crea una cuenta con rol `editor` en estado **no aprobado**.

```json
{
  "name": "Nuevo Usuario",
  "email": "nuevo@example.com",
  "password": "una-contraseña-larga"
}
```

Respuesta `201`:

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "nuevo@example.com",
      "name": "Nuevo Usuario",
      "role": "editor",
      "isActive": true,
      "isApproved": false
    },
    "message": "Cuenta creada. Un administrador debe aprobarla antes de iniciar sesión."
  }
}
```

La cuenta no puede iniciar sesión hasta que un administrador la apruebe y le asigne al menos un permiso de blog. El registro está limitado por IP: 5 intentos por 15 minutos; al superarlo responde `429 RATE_LIMITED`.

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
      "role": "admin",
      "isActive": true,
      "isApproved": true
    },
    "expiresAt": "2026-11-25T10:00:00.000Z"
  }
}
```

Si la cuenta existe y la contraseña es correcta pero todavía no está aprobada, responde `403 USER_PENDING_APPROVAL` con el mensaje exacto **`Usuario pendiente de aprobación`**. Una cuenta desactivada o una sesión de un usuario no aprobado se rechazan como `401 UNAUTHORIZED`.

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

### `PATCH /api/auth/profile`

```json
{
  "name": "Nombre Nuevo"
}
```

Requiere cookie. Actualiza el nombre del usuario autenticado y devuelve el usuario actualizado. El email es inmutable: enviarlo responde `400 VALIDATION_ERROR`.

### `PATCH /api/auth/password`

```json
{
  "currentPassword": "contraseña-actual",
  "newPassword": "contraseña-nueva-larga"
}
```

Cambia la contraseña. Exige la contraseña actual (`401 INVALID_CREDENTIALS` si no coincide), conserva la sesión desde la que se hace el cambio y revoca las demás sesiones del usuario. Responde `204`.

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

- `admin`: acceso completo a todos los blogs, estadísticas y gestión de usuarios.
- `editor`: solo ve los blogs que tenga asignados y actúa según su permiso:
  - `read` (**consulta**): puede listar y ver blogs y artículos, incluida la lectura del artículo.
  - `write` (**edición**): además puede crear, editar y borrar artículos y subir media.

`GET /api/admin/stats` y todas las rutas de `/api/admin/users` son exclusivas de `admin`. Acceder a un blog sin permiso responde `403 FORBIDDEN`.

Cada `BlogDto` incluye `permission` (`read` o `write`). Para un administrador siempre es `write`.

### Usuarios

Solo `admin`.

| Método   | Ruta                      | Descripción                                        |
| -------- | ------------------------- | -------------------------------------------------- |
| `GET`    | `/api/admin/users`        | Lista usuarios con sus permisos por blog           |
| `POST`   | `/api/admin/users`        | Crea un usuario                                    |
| `PATCH`  | `/api/admin/users/:id`    | Actualiza rol, estado, aprobación y permisos        |
| `DELETE` | `/api/admin/users/:id`    | Elimina el usuario y sus sesiones/permisos         |

Crear usuario:

```json
{
  "name": "Editor Nuevo",
  "email": "editor@example.com",
  "password": "una-contraseña-larga",
  "role": "editor",
  "isActive": true,
  "isApproved": false,
  "permissions": [{ "blogId": "uuid", "permission": "read" }]
}
```

Reglas:

- El **email es inmutable** y **único**. Solo se indica al crear la cuenta; no se puede cambiar desde la API, ni por el propio usuario.
- El **nombre** solo lo puede cambiar el propio usuario desde `PATCH /api/auth/profile`. Un administrador no puede editar el nombre de otros usuarios.
- Un usuario aprobado con rol `editor` debe tener **al menos un permiso**; si no, responde `400 APPROVAL_REQUIRES_PERMISSION`.
- Los `admin` se aprueban automáticamente y no necesitan permisos.
- Los permisos se reemplazan completos con el array `permissions` (hasta 100 blogs); `read` o `write`.
- `email` duplicado responde `409 EMAIL_IN_USE`.
- Un administrador no puede eliminarse (`400 CANNOT_DELETE_SELF`), desactivarse (`400 CANNOT_DEACTIVATE_SELF`) ni quitarse el rol (`400 CANNOT_DEMOTE_SELF`).
- Siempre debe quedar al menos un administrador activo (`409 LAST_ADMIN`).
- Retirar la aprobación o desactivar la cuenta invalida sus sesiones activas.

### Blogs

| Método   | Ruta                       | Rol                          | Descripción                             |
| -------- | -------------------------- | ---------------------------- | --------------------------------------- |
| `GET`    | `/api/admin/blogs`         | autenticado (con permiso)    | Lista con búsqueda, filtro y paginación |
| `POST`   | `/api/admin/blogs`         | admin                        | Crea un blog                            |
| `GET`    | `/api/admin/blogs/:blogId` | autenticado (con permiso)    | Detalle + `articleCount` + `permission` |
| `PATCH`  | `/api/admin/blogs/:blogId` | admin                        | Actualiza campos parciales              |
| `DELETE` | `/api/admin/blogs/:blogId` | admin                        | Elimina solo si no tiene artículos      |

Un `editor` solo recibe en la lista los blogs a los que tiene acceso (`read` o `write`).

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

Todos los artículos están anidados bajo un blog. Listar y leer requiere permiso `read`; crear, editar y borrar requiere `write`.

| Método   | Ruta                                           | Descripción                    |
| -------- | ---------------------------------------------- | ------------------------------ |
| `GET`    | `/api/admin/blogs/:blogId/articles`            | Lista con filtros y paginación |
| `POST`   | `/api/admin/blogs/:blogId/articles`            | Crea un artículo               |
| `GET`    | `/api/admin/blogs/:blogId/articles/:articleId` | Detalle con `body`, `bodyJson` y `coverImage` |
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
  "bodyJson": "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Introducción\"}]}]}",
  "coverImage": "https://<worker>.workers.dev/media/<blogId>/<uuid>.webp",
  "status": "draft",
  "publishedAt": null
}
```

`bodyJson` es el documento JSON de Tiptap serializado como cadena (máximo 1 MB). El servidor lo valida, lo convierte a HTML con una lista blanca de nodos y marcas, y guarda ambos:

- `bodyJson`: fuente de verdad editable.
- `body`: HTML generado, listo para servir en la API pública.

El HTML solo admite párrafos, títulos (`h1`–`h3`), listas, citas, código, enlaces, imágenes, vídeos, separadores y las marcas de negrita, cursiva, subrayado, tachado, código, resaltado, color de texto, familia y tamaño de fuente, además de la alineación. Cualquier nodo o atributo fuera de esa lista responde `400 INVALID_CONTENT`.

Un documento mínimo válido es:

```json
{
  "type": "doc",
  "content": [{ "type": "paragraph" }]
}
```

Un vídeo se representa con un nodo `video`:

```json
{
  "type": "video",
  "attrs": {
    "src": "https://<worker>.workers.dev/media/<blogId>/<uuid>.webm",
    "title": "Demostración"
  }
}
```

El servidor lo convierte en `<video controls playsinline preload="metadata" style="max-width: 100%; height: auto" src="…"></video>`.

`coverImage` es opcional y acepta una URL `http(s)` o una ruta absoluta. Normalmente será la URL devuelta por el endpoint de medios. En un `PATCH`, `null` elimina la portada y omitirlo deja la actual. La portada se asocia al artículo y se elimina de R2 y D1 cuando se reemplaza, se quita o se borra el artículo.

Reglas:

- `blogId` no se envía en el body: viene de la URL y es inmutable.
- `excerpt` es la descripción corta del artículo; en el panel se muestra como «Descripción».
- El slug es único dentro del blog.
- Si se publica (`published` o `featured`) sin `publishedAt`, el servidor asigna la fecha actual.
- Un artículo de otro blog bajo la URL de este responde `404`, no `403`.

### Imágenes y vídeos

| Método   | Ruta                                          | Descripción                        |
| -------- | --------------------------------------------- | ---------------------------------- |
| `POST`   | `/api/admin/blogs/:blogId/media`              | Sube un archivo (`multipart/form-data`, campo `file`); requiere `write` |
| `DELETE` | `/api/admin/blogs/:blogId/media/:mediaId`     | Elimina el archivo de D1 y R2 (solo admin) |
| `GET`    | `/media/:blogId/:filename`                    | Sirve el archivo con caché inmutable y soporte de rangos |

Límites y formatos:

- El endpoint acepta **`image/webp`** y **`video/webm`**. El editor convierte las imágenes a WebP y los vídeos a WebM en el navegador antes de subirlos.
- Imágenes: origen JPEG, PNG, WebP o AVIF de hasta **20 MB**; optimización a WebP con lado mayor máximo **2560 px** y calidad **0.75**; WebP final de hasta **5 MB**.
- Vídeos: origen MP4, MOV, WebM/MKV, OGG o TS de hasta **250 MB**; se convierten a **WebM (VP9/VP8 + Opus)**, con el lado mayor limitado a **1920 px** y audio a **128 kbps**. El WebM final puede pesar hasta **50 MB**.
- Por encima de los límites responde `413 FILE_TOO_LARGE`. Se comprueban los bytes mágicos: un WebP inválido responde `415 INVALID_IMAGE`, un WebM inválido `415 INVALID_VIDEO`, y un tipo no admitido `415 UNSUPPORTED_MEDIA_TYPE`.
- La respuesta incluye una URL absoluta (`url`) lista para usar como `src` de un nodo `image` o `video`:

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

Un vídeo devuelve el mismo DTO con `filename` y `url` terminados en `.webm` y `mimeType: "video/webm"`.

La entrega usa `Cache-Control: public, max-age=31536000, immutable`, `ETag` (responde `304` con `If-None-Match`), `Content-Type` del objeto, `Accept-Ranges: bytes` y `X-Content-Type-Options: nosniff`. Las peticiones `Range` responden `206` con `Content-Range`, lo que permite buscar dentro del vídeo.

Cada subida genera un objeto y una fila propios. Al guardar el artículo, las imágenes y vídeos presentes en el documento, y la portada, quedan asociados a él; los que se han quitado se eliminan de R2 y D1. Un archivo pertenece a un único artículo: reutilizar la URL de otro artículo responde `409 MEDIA_IN_OTHER_ARTICLE`. Al eliminar un artículo se eliminan también sus archivos, incluida la portada, y al eliminar un blog sin artículos se limpian los que hayan quedado sin asignar.

### Estadísticas

`GET /api/admin/stats` (solo `admin`)

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
| `GET`  | `/api/public/v1/blogs/:blogSlug/articles/:articleSlug` | Detalle con `body` en HTML y `coverImage` |

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
      "title": "Cómo empezar",
      "slug": "como-empezar",
      "excerpt": "Una introducción breve.",
      "coverImage": "https://<worker>.workers.dev/media/<blogId>/<uuid>.webp",
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

Detalle de artículo:

```json
{
  "data": {
    "id": "uuid",
    "title": "Cómo empezar",
    "slug": "como-empezar",
    "excerpt": "Una introducción breve",
    "coverImage": "https://<worker>.workers.dev/media/<blogId>/<uuid>.webp",
    "author": "Daniel",
    "status": "published",
    "body": "<p>Texto con <span style=\"color: #dc2626; font-family: Lora, Georgia, serif\">estilo</span>.</p>",
    "createdAt": "2026-11-03T10:00:00.000Z",
    "publishedAt": "2026-11-12T10:00:00.000Z",
    "updatedAt": "2026-11-12T10:00:00.000Z",
    "blog": {
      "name": "Página A",
      "slug": "pagina-a",
      "siteUrl": "https://pagina-a.example.com"
    }
  }
}
```

El campo `body` ya es HTML seguro generado en el servidor: la web consumidora puede insertarlo directamente sin volver a renderizar markdown. Puede incluir imágenes y vídeos con URLs absolutas. `coverImage` es la miniatura del artículo y puede ser `null`.

### Fuentes en las webs consumidoras

El editor permite aplicar un catálogo de 106 familias populares de Google Fonts (sans, serif, display, mono y manuscritas) con buscador, además de fuentes del sistema. El HTML guarda el nombre de la familia con alternativas locales (`Lora, Georgia, serif`), pero la web consumidora debe cargar la fuente para que se vea exactamente igual que en el editor. Por ejemplo, en el `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Lora:ital,wght@0,400;0,700;1,400&family=Merriweather:wght@400;700&family=Montserrat:wght@400;700&family=Playfair+Display:wght@400;700&family=Roboto:wght@400;700&display=swap"
  rel="stylesheet"
/>
```

Si una web no las carga, el navegador usará las alternativas locales indicadas en `font-family` (por ejemplo, Georgia para Lora).

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
