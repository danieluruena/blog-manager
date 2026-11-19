# Plan de implementación — Blog Manager

> **Estado:** plan actualizado con las decisiones confirmadas.
> **Progreso:** Fase 0 completada. Fase 1 completada: esquema D1, migraciones, repositorios, seed y CLI de administración. Fase 2 completada: auth, CRUD de blogs y artículos, stats, API pública y CORS. Fase 3 completada: sistema de diseño, login, shell responsive y panel. Fase 4 completada: CRUD visual de blogs, ajustes, activación/desactivación y borrado bloqueado. Fase 5 completada: listado de artículos con filtros, publicación y aviso de cambios sin guardar. Fase 6 completada: subida de imágenes a R2 con pegar/arrastrar, entrega con caché y limpieza. Fase 7 completada: hardening de seguridad, cabeceras, accesibilidad, tests y documentación operativa. Fase 8 completada: D1/R2 remotos, secreto, migraciones, despliegue y pipeline. Fase 9 completada: editor rich text con Tiptap, `body_json`, renderizado HTML seguro y conversión de artículos locales. Fase 10 completada: imagen de portada con previsualización, subida diferida y miniatura en el listado. Fase 11 completada: vídeos WebM con conversión en el navegador y entrega con rangos.
> **Documento de arquitectura:** [`ARQUITECTURA.md`](./ARQUITECTURA.md)
> **Fecha:** 2026-11-18

---

## 1. Decisiones que guían el plan

| Tema | Decisión |
|---|---|
| Autenticación | Login propio multiusuario (sin Cloudflare Access). |
| Host | Un único host gratuito `*.workers.dev`. |
| Imágenes | R2 desde el MVP, con pegar/arrastrar y subida diferida al guardar. |
| Consumo público | Las webs consultan desde el navegador; CORS por blog. |
| Borrado de blogs | Bloqueado si el blog tiene artículos. |
| Usuarios | Multiusuario desde el esquema; un administrador inicial. |
| IaC | `wrangler.jsonc` + script de bootstrap + migraciones; sin Terraform en el MVP. |

---

## 2. Alcance

### MVP (imprescindible)

- Login propio con sesiones y un administrador inicial.
- Esquema multiusuario (`users`, `sessions`) y roles `admin`/`editor`; en el MVP solo se usa `admin`.
- CRUD de blogs: nombre, slug, descripción, URL de la página, orígenes CORS y activo/inactivo.
- Borrado de blog bloqueado si tiene artículos (`409 BLOG_HAS_ARTICLES`).
- CRUD de artículos por blog: título, slug, descripción corta, autor, fechas, estado y contenido rich text.
- Estados: `draft`, `published`, `hidden`, `featured`.
- Editor rich text con fuentes, tamaños, colores, resaltado, alineación, enlaces, imágenes, listas, citas y código.
- Imagen de portada por artículo con previsualización y miniatura en el listado.
- Vídeos WebM en el contenido, con optimización en el navegador y subida diferida.
- Persistencia del documento Tiptap en `body_json`; el servidor genera y sirve el HTML de `body`.
- Subida de imágenes a R2 al pegar, arrastrar o seleccionar; optimización a WebP y subida diferida al guardar.
- API pública de solo lectura, versionada, aislada por blog y con CORS.
- Interfaz oscura, responsive y accesible.
- Base de datos D1 con migraciones.
- Despliegue en Cloudflare Workers (`*.workers.dev`).
- Tests de API, incluidos auth, aislamiento, CORS y bloqueo de borrado.
- Documentación de uso y despliegue.

### Post-MVP (deseable)

- UI de gestión de usuarios (crear, desactivar, cambiar rol, resetear contraseña).
- Asignación de blogs por usuario/editor.
- API keys por blog para builds/SSR.
- Publicación programada (`published_at` futuro).
- Búsqueda full-text (FTS5).
- Historial de versiones de artículos.
- Autoguardado.
- Galería de medios por blog.
- Analítica de lecturas.
- Sitemap/RSS generados desde la API.
- Webhooks al publicar.
- Reset de contraseña por email.

---

## 3. Resumen de fases

| Fase | Entrega | Estimación |
|---|---|---|
| 0 | Fundaciones, bootstrap y esqueleto desplegable | 0,5–1 día |
| 1 | Esquema D1, migraciones, repositorios y CLI de admin | 1,5–2 días |
| 2 | Auth, CRUD de blogs/artículos, API pública y CORS | 3–4 días |
| 3 | Base del frontend, tema oscuro y login | 1–2 días |
| 4 | UI de blogs, ajustes y panel | 1 día |
| 5 | UI de artículos y editor rich text | 2–3 días |
| 6 | Imágenes en R2 con pegar/arrastrar | 1–1,5 días |
| 7 | Hardening, tests, accesibilidad y rendimiento | 1–2 días |
| 8 | Despliegue y documentación | 0,5–1 día |
| 9 | Editor rich text, `body_json` y migración de contenido | 2–3 días |
| 10 | Imagen de portada y miniatura en el listado | 0,5–1 día |
| 11 | Vídeos WebM con conversión en navegador | 1–2 días |

**Total orientativo:** 11–17 días de trabajo efectivo. El MVP funcional (fases 0–6) se puede tener en 10–14 días; la diferencia depende sobre todo del editor y de las pruebas de auth/CORS.

---

## 4. Fase 0 — Fundaciones

### Objetivo

Tener un esqueleto que arranque en local y se despliegue, con la configuración de Cloudflare y el bootstrap listos.

### Tareas

- [ ] Crear la rama `feat/project-foundation` desde `develop` (ver `CONTRIBUTING.md`).
- [ ] Confirmar detalles menores: nombre del Worker, subdominio, email/nombre del admin inicial y nombre visible de la app.
- [ ] Inicializar `package.json` con TypeScript strict, npm y Node 22 LTS.
- [ ] Instalar React, Vite, `@cloudflare/vite-plugin`, Wrangler, Hono, Zod y Drizzle.
- [ ] Configurar `vite.config.ts` con el plugin de Cloudflare.
- [ ] Crear `wrangler.jsonc` con:
  - [ ] `workers_dev: true`.
  - [ ] Bindings D1 (`DB`) y R2 (`MEDIA`).
  - [ ] Assets con `not_found_handling: "single-page-application"`.
  - [ ] `run_worker_first: ["/api/*", "/media/*"]`.
  - [ ] `observability`.
- [ ] Configurar alias `@client`, `@server`, `@shared`.
- [ ] Crear `src/server/index.ts` con `GET /api/health`.
- [ ] Crear `src/client` con layout mínimo y pantalla de bienvenida.
- [ ] Configurar ESLint, Prettier y scripts (`dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `deploy`).
- [ ] Crear `.dev.vars.example` y completar `.gitignore` (`.wrangler`, `.dev.vars*`).
- [ ] Crear `scripts/bootstrap.ts`:
  - [ ] Comprueba si existen D1 y R2; si no, los crea.
  - [ ] Muestra los IDs y los pasos para actualizar `wrangler.jsonc`.
  - [ ] No sobrescribe configuración existente.
- [ ] Crear el esqueleto de `scripts/create-admin.ts` (sin lógica de negocio todavía).
- [ ] Configurar Vitest con `@cloudflare/vitest-plugin` (esqueleto).
- [ ] Verificar `npm run dev`, `npm run build` y `npm run preview`.

### Criterios de aceptación

- `npm run dev` sirve la SPA y responde `{"ok":true}` en `/api/health`.
- `npm run build` termina sin errores.
- `npm run preview` funciona en el runtime de Workers.
- `wrangler deploy` despliega a `*.workers.dev`.
- `npm run typecheck` y `npm run lint` pasan.
- `npm run bootstrap` es seguro de ejecutar dos veces.

### Riesgos de la fase

- Configuración del plugin de Vite con Worker + assets. Se valida con `/api/health` antes de escribir funcionalidad.
- El subdominio `*.workers.dev` debe estar disponible; si no, se elige otro nombre.

---

## 5. Fase 1 — Datos, migraciones y CLI de administración

### Objetivo

Tener el esquema definitivo, migraciones reproducibles, repositorios tipados y un primer admin creado por CLI.

### Tareas

- [ ] Definir el esquema Drizzle en `src/server/db/schema.ts`:
  - [ ] `users`, `sessions`, `auth_attempts`.
  - [ ] `blogs` con `allowed_origins`.
  - [ ] `articles` con FK `ON DELETE RESTRICT`.
  - [ ] `media` con FK `ON DELETE CASCADE`.
- [ ] Generar la migración `0000_initial.sql` con `drizzle-kit generate`.
- [ ] Añadir índices y restricciones:
  - [ ] `UNIQUE (blog_id, slug)` en artículos.
  - [ ] `UNIQUE` en `blogs.slug`, `users.email` y `sessions.token_hash`.
  - [ ] `CHECK` de estados y roles.
  - [ ] Índices de listados (`blog_id`, `status`, `published_at`, `updated_at`).
- [ ] Crear `src/server/db/client.ts` con `drizzle(env.DB)`.
- [ ] Implementar repositorios:
  - [ ] `usersRepository`: buscar por email, crear, obtener, actualizar, desactivar.
  - [ ] `sessionsRepository`: crear, buscar por hash, borrar, borrar por usuario, limpiar expiradas.
  - [ ] `blogsRepository`: listar con búsqueda/filtro/paginación, obtener, crear, actualizar, borrar, contar artículos.
  - [ ] `articlesRepository`: listar por blog, obtener por blog, crear, actualizar, borrar.
  - [ ] `statsRepository`: métricas del panel.
- [ ] Implementar helpers:
  - [ ] `nowIso()` y normalización de fechas.
  - [ ] Generación de IDs.
  - [ ] Generación de slugs y resolución de colisiones.
  - [ ] `hashPassword`/`verifyPassword` (HMAC-SHA256 + pepper secreto, compatible con el plan gratuito de Workers).
  - [ ] `generateSessionToken`/`hashSessionToken`.
- [ ] Implementar `scripts/create-admin.ts`:
  - [ ] Pide email, nombre y contraseña de forma interactiva.
  - [ ] Valida email y contraseña (mínimo 12 caracteres).
  - [ ] Inserta el usuario en D1 local o remoto.
  - [ ] No imprime el hash ni la contraseña.
- [ ] Crear `seeds/seed.sql` con 2 blogs y 6–8 artículos de ejemplo (estados variados).
- [ ] Añadir tests unitarios de slugs, fechas y hashing.
- [ ] Añadir tests de repositorios contra D1 local.

### Criterios de aceptación

- `wrangler d1 migrations apply blog-manager-db --local` crea el esquema desde cero.
- `npm run db:seed` carga datos de ejemplo.
- `npm run user:create` crea un admin local y se puede verificar en D1.
- El hash de contraseña verifica correctamente y no se puede revertir.
- Los repositorios no permiten consultar artículos sin `blogId`.
- Los tests de repositorios pasan.
- `EXPLAIN QUERY PLAN` confirma que los listados usan índices.

---

## 6. Fase 2 — API de administración y API pública

### Objetivo

API REST completa, validada, autenticada, con CORS y aislamiento por blog.

### Tareas

- [ ] Montar la app Hono con middlewares: request ID, logging, errores, secure headers y CORS.
- [ ] Implementar el envelope de respuesta y el manejador central de errores.
- [ ] Implementar autenticación:
  - [ ] `POST /api/auth/login`: email + contraseña, rate limiting, cookie de sesión.
  - [ ] `POST /api/auth/logout`: borra sesión y cookie.
  - [ ] `GET /api/auth/me`: usuario actual o 401.
  - [ ] `PATCH /api/auth/password`: cambia contraseña y revoca sesiones.
  - [ ] Middleware `requireAuth` para `/api/admin/*`.
  - [ ] Middleware `requireRole('admin')` donde corresponda.
- [ ] Implementar rate limiting de login con `auth_attempts`:
  - [ ] 5 intentos / 15 minutos por hash de IP y por hash de email (claves separadas).
  - [ ] Respuesta `429` con `Retry-After`.
  - [ ] Limpieza oportunista de registros antiguos.
- [ ] Implementar CRUD de blogs:
  - [ ] `GET /api/admin/blogs` con `q`, `active`, `page`, `pageSize`, `sort`.
  - [ ] `POST /api/admin/blogs`.
  - [ ] `GET /api/admin/blogs/:blogId`.
  - [ ] `PATCH /api/admin/blogs/:blogId` (incluye `isActive` y `allowedOrigins`).
  - [ ] `DELETE /api/admin/blogs/:blogId`:
    - [ ] Si `articleCount > 0`, `409 BLOG_HAS_ARTICLES`.
    - [ ] Si no, borrar media de R2 y luego el blog.
- [ ] Implementar CRUD de artículos anidado:
  - [ ] `GET /api/admin/blogs/:blogId/articles` con `q`, `status`, `sort`, paginación.
  - [ ] `POST /api/admin/blogs/:blogId/articles`.
  - [ ] `GET /api/admin/blogs/:blogId/articles/:articleId`.
  - [ ] `PATCH /api/admin/blogs/:blogId/articles/:articleId`.
  - [ ] `DELETE /api/admin/blogs/:blogId/articles/:articleId`.
- [ ] Reglas de negocio:
  - [ ] Al publicar sin `publishedAt`, asignar `now`.
  - [ ] `blogId` inmutable en artículos.
  - [ ] Verificar pertenencia artículo ↔ blog; 404 si no coincide.
  - [ ] Slugs únicos; 409 en conflicto manual.
- [ ] Implementar `GET /api/admin/stats`.
- [ ] Implementar API pública:
  - [ ] `GET /api/public/v1/blogs/:blogSlug` (solo activos).
  - [ ] `GET /api/public/v1/blogs/:blogSlug/articles` con cursor, `limit`, `featured`.
  - [ ] `GET /api/public/v1/blogs/:blogSlug/articles/:articleSlug` (solo visibles).
  - [ ] Filtrar `published` y `featured`; excluir `draft` y `hidden`.
- [ ] Implementar CORS de la API pública:
  - [ ] Origen permitido = origen de `site_url` + `allowed_origins`.
  - [ ] `Access-Control-Allow-Origin` solo si coincide.
  - [ ] `Vary: Origin`.
  - [ ] Sin credenciales.
- [ ] Documentar la API en `docs/API.md` (endpoints, payloads, errores, ejemplos, CORS).
- [ ] Tests de integración:
  - [ ] Login correcto/incorrecto, cookie, logout, sesión expirada y usuario desactivado.
  - [ ] Rate limiting de login.
  - [ ] Permisos `admin` vs `editor` (si se implementa el rol).
  - [ ] CRUD de blogs.
  - [ ] CRUD de artículos.
  - [ ] Validaciones y 409.
  - [ ] **Aislamiento:** artículo del blog B bajo el blog A → 404.
  - [ ] **Aislamiento público:** el listado del blog A no incluye artículos del B.
  - [ ] Blog inactivo → 404.
  - [ ] `draft`/`hidden` no aparecen en la API pública.
  - [ ] Borrado de blog con artículos → 409; sin artículos → 204.
  - [ ] CORS permitido/denegado.

### Criterios de aceptación

- Todos los endpoints funcionan contra D1 local.
- Las peticiones sin sesión a `/api/admin/*` devuelven 401.
- El login tiene rate limiting efectivo.
- Los tests de aislamiento, CORS y borrado bloqueado pasan.
- La API pública nunca devuelve artículos no visibles.
- La documentación de API coincide con la implementación.

---

## 7. Fase 3 — Base del frontend, tema y login

### Objetivo

Tener el shell de la aplicación, el tema oscuro y el flujo de login.

### Tareas

- [ ] Configurar Tailwind CSS y los tokens de color/tipografía de `ARQUITECTURA.md` §9.
- [ ] Instalar y configurar shadcn/ui con el tema oscuro.
- [ ] Crear el layout:
  - [ ] Sidebar con navegación y lista de blogs.
  - [ ] Header con breadcrumb, búsqueda y acción primaria.
  - [ ] Contenedor responsive y drawer móvil.
  - [ ] Menú de usuario con nombre, email y “Cerrar sesión”.
- [ ] Configurar React Router con las rutas de `ARQUITECTURA.md` §9.5.
- [ ] Configurar TanStack Query (`QueryClient`, devtools en desarrollo).
- [ ] Crear el cliente API tipado con Zod y manejo uniforme de errores.
- [ ] Crear componentes base: Button, Input, Textarea, Select, Badge, Dialog, AlertDialog, DropdownMenu, Tabs, Tooltip, Skeleton, EmptyState, Table, Pagination.
- [ ] Implementar toasts con Sonner.
- [ ] Implementar ErrorBoundary y pantalla 404.
- [ ] Implementar la pantalla de login:
  - [ ] Email y contraseña.
  - [ ] Errores genéricos.
  - [ ] Estado de carga y bloqueo de envío.
  - [ ] Redirección a `/` si ya hay sesión.
- [ ] Implementar guard de rutas: si `/api/auth/me` da 401, redirigir a `/login`.
- [ ] Añadir fuentes y estilos globales (scrollbars, selección, foco).

### Criterios de aceptación

- Se puede iniciar y cerrar sesión.
- Las rutas privadas redirigen a `/login` sin sesión.
- La navegación entre pantallas vacías funciona.
- El tema oscuro se ve consistente en todas las primitivas.
- La sidebar es responsive (drawer en móvil).
- No hay errores de consola ni de hidratación.
- Los componentes tienen estados hover, focus, disabled y loading.

---

## 8. Fase 4 — UI de blogs y panel

### Objetivo

Gestionar blogs desde la interfaz y ver un panel útil.

### Tareas

- [ ] Pantalla `/blogs`:
  - [ ] Grid de tarjetas con nombre, descripción, URL, estado y número de artículos.
  - [ ] Búsqueda y filtro activo/inactivo.
  - [ ] Botón “Nuevo blog”.
  - [ ] Acciones editar, activar/desactivar y borrar.
- [ ] Formulario de blog (drawer o página):
  - [ ] Campos nombre, slug, descripción, URL, orígenes CORS y activo.
  - [ ] Generación automática de slug desde el nombre (editable).
  - [ ] Validación con Zod y errores inline.
  - [ ] Manejo de 409 por slug duplicado.
- [ ] Toggle activo/inactivo con actualización optimista y toast.
- [ ] Borrado de blog:
  - [ ] Si tiene artículos, botón deshabilitado o modal que explica el bloqueo y sugiere desactivar.
  - [ ] Si no tiene, confirmación escribiendo el nombre.
- [ ] Pantalla `/` (panel):
  - [ ] Tarjetas: total blogs, activos, artículos, publicados/borradores.
  - [ ] Actividad reciente (últimos artículos actualizados).
  - [ ] Resumen por blog con enlace a su workspace.
- [ ] Estados vacíos y skeletons.
- [ ] Enlaces al sitio público (`siteUrl`) con `target="_blank"` y `rel` seguro.

### Criterios de aceptación

- Se puede crear, editar, activar/desactivar y borrar un blog desde la UI.
- El slug se genera y se valida correctamente.
- El borrado de un blog con artículos queda bloqueado con un mensaje claro.
- Los ajustes de CORS se guardan y se reflejan en la API.
- El panel refleja los datos reales de D1.

---

## 9. Fase 5 — UI de artículos y editor

> El editor de esta fase se sustituyó por Tiptap en la Fase 9 (ver §14).

### Objetivo

Gestionar artículos por blog con un editor cómodo y publicación clara.

### Tareas

- [x] Pantalla `/blogs/:blogId/articles`:
  - [x] Cabecera del blog con estado, URL y acciones.
  - [x] Barra de filtros: búsqueda, estado, orden.
  - [x] Tabla/cards con título, autor, estado, publicación, actualización y acciones.
  - [x] Paginación.
  - [x] Acciones rápidas: editar, publicar/despublicar, borrar.
- [x] Editor `/blogs/:blogId/articles/new` y `/:articleId`:
  - [x] Campo título grande.
  - [x] Panel de metadatos: blog (solo lectura), autor, estado, fecha de creación (solo lectura), fecha de publicación, slug.
  - [x] Editor WYSIWYG con toolbar (sustituido por Tiptap en la Fase 9).
  - [x] Botones Guardar, Cancelar y Publicar.
  - [x] Aviso de cambios sin guardar (beforeunload + navegación interna).
  - [x] Contador de palabras/caracteres.
  - [x] Manejo de errores de validación y conflictos de slug.
- [x] Flujo de publicación:
  - [x] Si se elige `published`/`featured` y no hay fecha, asignar ahora (servidor).
  - [x] Feedback claro del estado resultante.
- [x] Acciones de estado desde la tabla con actualización optimista.
- [x] Confirmación de borrado de artículo.
- [x] Estado vacío: “Este blog todavía no tiene artículos”.
- [x] Atajo `Ctrl/Cmd + S` para guardar.
- [ ] Tests de componentes críticos (formulario, editor, toggle de estado). Pendiente: requiere entorno DOM (jsdom/RTL); la lógica de fechas y recuento ya tiene tests unitarios.
- [x] Vista previa integrada en el editor visual (sustituida por Tiptap en la Fase 9).

### Criterios de aceptación

- Se puede crear un artículo, guardarlo como borrador, publicarlo y verlo en la API pública.
- El body se guarda como rich text y se recupera sin pérdidas.
- El HTML generado refleja fuentes, colores y alineación.
- Los cambios sin guardar avisan antes de salir.
- El editor funciona en móvil (stack vertical).

---

## 10. Fase 6 — Imágenes en R2 con pegar/arrastrar

### Objetivo

Subir imágenes desde el editor y servirlas con caché.

### Tareas

- [x] Crear bucket R2 y binding `MEDIA` (el bootstrap ya lo deja preparado).
- [x] Endpoint `POST /api/admin/blogs/:blogId/media` (multipart):
  - [x] Validar tamaño (≤ 5 MB) y que sea WebP.
  - [x] Optimizar en el navegador: conversión a WebP, lado mayor ≤ 2560 px y calidad 0.75.
  - [x] Generar clave `blogs/<blogId>/<uuid>.<ext>`.
  - [x] Guardar objeto en R2 en streaming y metadata en D1.
  - [x] Devolver URL pública.
- [x] Endpoint `GET /media/:blogId/:filename`:
  - [x] Leer de R2.
  - [x] `Cache-Control: public, max-age=31536000, immutable`.
  - [x] ETag y `Content-Type` correctos.
  - [x] 404 si no existe.
- [x] Integrar en el editor:
  - [x] Subida desde la toolbar del editor (Tiptap desde la Fase 9).
  - [x] Manejo de `paste` para imágenes del portapapeles.
  - [x] Manejo de `drop` para arrastrar archivos.
  - [x] Previsualización local con `blob:` y subida solo al guardar las imágenes que sigan en el artículo.
  - [x] Cada imagen se asocia a un artículo; al guardar se eliminan de R2 y D1 las retiradas.
  - [x] Impedir reutilizar una imagen de otro artículo (objetos independientes por subida).
  - [x] Placeholder/progreso durante la subida.
  - [x] Inserción de `![alt](url)` en la posición del cursor.
  - [x] Toast de error y reintento.
- [x] Borrado de imagen: metadata + objeto R2.
- [x] Al borrar un blog sin artículos, borrar sus objetos de R2 en `ctx.waitUntil()`.
- [x] Tests de validación de tamaño/MIME y de entrega.
- [x] Documentar límites y formatos permitidos.

### Criterios de aceptación

- Se pega una imagen desde el portapapeles y se sube automáticamente.
- Se arrastra una imagen al editor y se inserta.
- La imagen se sirve con caché larga.
- Un archivo demasiado grande o de tipo no permitido se rechaza con 400.
- Borrar el blog sin artículos no deja objetos huérfanos (o quedan documentados y limpiables).

---

## 11. Fase 7 — Hardening y calidad

### Objetivo

Cerrar seguridad, rendimiento, accesibilidad y cobertura de tests.

### Tareas

- [x] Revisar auth: hashing, cookies, expiración, revocación, rate limiting y errores genéricos.
- [x] Revisar CSRF: `SameSite=Strict` + validación de `Origin`.
- [x] Revisar CORS: origen de `site_url`, `allowed_origins`, `Vary: Origin`, sin credenciales.
- [x] Revisar cabeceras de seguridad y CSP ajustada al build.
- [x] Revisar uploads: MIME, tamaño, `nosniff`, SVG.
- [x] Tests de integración completos con `@cloudflare/vitest-plugin` (77 tests).
- [x] Test E2E de humo con Playwright (verificado manualmente; no en CI):
  - [x] Login → crear blog → crear artículo → subir imagen → publicar → verificar API pública → borrado bloqueado.
- [x] Auditoría de accesibilidad: foco, contraste, labels, teclado (axe sin violaciones en 5 pantallas).
- [x] Revisar bundle: editor en chunk separado; sin dependencias de servidor en el cliente.
- [x] Medir y documentar `EXPLAIN QUERY PLAN` de las consultas principales.
- [x] Configurar observabilidad y logs estructurados.
- [x] Configurar backup/export y probar restauración en local.
- [x] Revisar checklist de seguridad de Workers (secretos, bindings, sin estado global).
- [x] Documentar runbook: deploy, rollback, migraciones, reseteo de admin, incidentes.
- [x] Verificar que `workers_dev` es el host esperado y que no hay rutas de administración sin auth.

### Criterios de aceptación

- Suite de tests verde (unitarios + integración).
- `typecheck`, `lint` y `build` limpios.
- Sin vulnerabilidades evidentes en revisión manual (SQLi, XSS, CSRF, auth bypass).
- Lighthouse/axe sin problemas críticos.
- Logs y alertas funcionando.
- Backup probado.

---

## 12. Fase 8 — Despliegue y documentación

### Objetivo

Poner la aplicación en producción y dejar el proyecto mantenible.

### Tareas

- [x] Ejecutar `npm run bootstrap` y copiar el `database_id`.
- [x] Aplicar migraciones en remoto.
- [ ] Crear el administrador inicial en remoto.
- [x] Verificar el subdominio `*.workers.dev` y el nombre del Worker.
- [x] Configurar CI/CD (Workers Builds o GitHub Actions).
- [x] Configurar workflow manual de migraciones.
- [ ] Smoke test en producción:
  - [ ] Login.
  - [ ] Crear blog.
  - [ ] Crear artículo.
  - [ ] Subir imagen y publicar.
  - [ ] Consultar API pública desde un origen permitido.
  - [ ] Verificar que el blog A no devuelve artículos del B.
  - [ ] Verificar que no se puede borrar un blog con artículos.
- [x] Escribir `README.md`: requisitos, instalación, scripts, variables, deploy.
- [x] Escribir `docs/API.md` definitivo.
- [x] Documentar operación: backups, restauración, reseteo de contraseña del admin, migraciones.
- [ ] Etiquetar la versión `v0.1.0`.

### Criterios de aceptación

- URL de producción funcionando en `*.workers.dev`.
- Administración protegida por login.
- API pública aislada por blog y con CORS correcto.
- Migraciones reproducibles desde cero.
- Documentación suficiente para retomar el proyecto sin contexto externo.

---

## 13. IaC: decisión y alcance

**No se incluye Terraform/Pulumi en el MVP.** El proyecto ya tiene una IaC ligera y suficiente:

- `wrangler.jsonc` declara Worker, bindings, assets, observabilidad y rutas.
- `migrations/*.sql` versiona el esquema y los cambios de datos.
- `scripts/bootstrap.ts` crea D1/R2 y evita pasos manuales.
- El workflow de CI/CD despliega el artefacto probado.

**Cuándo reconsiderar IaC completa:**

- Varios entornos estables (staging + producción) con recursos propios.
- Varios Workers o servicios (por ejemplo, un Worker separado para imágenes).
- DNS, Cloudflare Access, WAF y reglas de caché gestionadas en el mismo repositorio.
- Más de una persona con permisos de infraestructura.
- Requisitos de auditoría, compliance o recuperación ante desastres.

En ese momento, Terraform es la opción madura; Alchemy es interesante si se quiere definir todo en TypeScript, pero añade un proveedor más nuevo. Los secretos deben quedar fuera del estado de IaC en cualquier caso.

**Presupuesto si se adopta:** 1–2 días de configuración inicial (estado remoto, provider, módulos, importar recursos existentes) y mantenimiento continuo. No se justifica para un solo Worker, una D1 y un R2.

---

## 14. Fase 9 — Editor rich text y migración de contenido

### Objetivo

Sustituir el editor markdown por un editor rich text que permita fuentes, tamaños, colores y resaltado, sin comprometer la seguridad del HTML servido.

### Decisiones

- **Editor:** Tiptap 3 + ProseMirror, con extensiones compartidas entre cliente y servidor.
- **Persistencia:** `body_json` guarda el documento JSON (fuente de verdad) y `body` guarda el HTML generado.
- **API:** la entrada usa `bodyJson`; la salida pública mantiene `body`, ahora en HTML. No había consumidores, así que el cambio de contrato no requiere compatibilidad dual.
- **Renderizado:** lista blanca propia sin DOM (`src/server/lib/richtext.ts`). Se descartó `generateHTML` de Tiptap porque depende de `happy-dom` y no funciona en Workers.
- **Fuentes:** catálogo de 106 Google Fonts populares con buscador y carga bajo demanda, con fallbacks locales.
- **Tablas:** descartadas. `TableKit` provocaba `RangeError: Duplicate use of selection JSON ID cell` al cargar en Workers y no eran un requisito.

### Tareas

- [x] Migración `0002_article_body_json` con la columna `body_json`.
- [x] Esquema de entrada `bodyJson` y tipos `ArticleDto`/`ArticleFormValues`.
- [x] Renderizador HTML con lista blanca, validación de estilos y URLs.
- [x] Editor Tiptap con toolbar, atajos, enlaces, imágenes y contador.
- [x] Pipeline de imágenes adaptado a nodos `image` y subida diferida.
- [x] Script `articles:convert` para convertir los artículos locales de markdown a Tiptap/HTML.
- [x] Tests del renderizador, del formulario y del flujo de imágenes.
- [x] Documentación de API, arquitectura, operaciones y rendimiento.

### Criterios de aceptación

- Se puede aplicar familia, tamaño, color y resaltado, y persisten al guardar y reeditar.
- El servidor rechaza nodos, marcas, estilos y URLs no permitidos con `400 INVALID_CONTENT`.
- La API pública devuelve HTML ya seguro.
- Los 8 artículos locales quedan migrados y se siguen viendo en la API.
- `typecheck`, `lint`, `test`, `build`, `format:check` y `audit` pasan.

---

## 15. Fase 10 — Imagen de portada

### Objetivo

Permitir una imagen de portada por artículo, visible junto al título en el listado y en la API pública, reutilizando el pipeline de imágenes existente.

### Tareas

- [x] Migración `0003_article_cover_image` con la columna `cover_image`.
- [x] Campo `coverImage` en la entrada de la API y en los DTO de resumen y detalle.
- [x] Campo de portada debajo del título con previsualización, cambio y borrado.
- [x] Vista previa de la miniatura en dos configuraciones: portada a la izquierda y portada arriba.
- [x] Optimización a WebP y subida diferida al guardar, junto a las imágenes del contenido.
- [x] Asociación de la portada al artículo y limpieza de la anterior en R2 y D1.
- [x] Miniatura en el listado de artículos y exposición en la API pública.
- [x] Tests de creación, reemplazo, borrado y reutilización indebida.
- [x] Documentación actualizada.

### Criterios de aceptación

- La portada se previsualiza en local antes de guardar y se sube solo al guardar.
- Se guarda como WebP en R2 y aparece junto al título en el listado.
- Reemplazarla o quitarla elimina la imagen anterior de R2 y D1.
- La API pública devuelve `coverImage` en listado y detalle.
- `typecheck`, `lint`, `test`, `build`, `format:check` y `audit` pasan.

---

## 16. Fase 11 — Vídeos en los artículos

### Objetivo

Permitir insertar vídeos en el contenido con el mismo flujo que las imágenes: optimización local, previsualización y subida diferida al guardar.

### Tareas

- [x] Nodo Tiptap `video` y renderizado HTML seguro con `<video controls>`.
- [x] Conversión a WebM (VP9/VP8 + Opus) en el navegador con Mediabunny y WebCodecs.
- [x] Límites: 250 MB de origen, 1920 px de lado mayor, 128 kbps de audio y 50 MB de WebM final.
- [x] Subida diferida al guardar, asociación al artículo y limpieza de vídeos retirados.
- [x] Endpoint de medios con `video/webm`, validación de bytes mágicos y entrega con `Range`.
- [x] Botón y arrastrar/soltar para vídeos en el editor.
- [x] Tests de conversión, subida, rangos, asociación y borrado.
- [x] Documentación actualizada.

### Criterios de aceptación

- El vídeo se previsualiza en local antes de guardar y se sube solo al guardar.
- Se guarda como WebM en R2 y el HTML generado incluye `<video>`.
- La entrega responde `206` a peticiones `Range`.
- Quitar el vídeo o borrar el artículo elimina el objeto de R2 y su fila de D1.
- `typecheck`, `lint`, `test`, `build`, `format:check` y `audit` pasan.

---

## 17. Definition of Done (MVP)

El MVP se considera terminado cuando:

- [ ] Se puede iniciar sesión como administrador y cerrar sesión.
- [ ] El esquema soporta múltiples usuarios y roles, aunque solo se use un admin.
- [ ] Se pueden crear, editar, activar/desactivar y borrar blogs.
- [ ] Un blog con artículos no se puede borrar; la UI lo explica.
- [ ] Se pueden crear, editar, publicar, ocultar, destacar y borrar artículos.
- [ ] Cada artículo pertenece a un único blog y la UI/API respetan el aislamiento.
- [ ] El body es rich text, se guarda en `body_json` y la API devuelve HTML.
- [ ] Se pueden pegar/arrastrar imágenes y vídeos y se suben a R2; cada artículo puede tener una portada con miniatura en el listado.
- [ ] La API pública devuelve solo artículos visibles del blog solicitado y respeta CORS.
- [ ] La interfaz es oscura, responsive y usable en móvil.
- [ ] `typecheck`, `lint`, `test` y `build` pasan.
- [ ] El despliegue está automatizado o documentado paso a paso.
- [ ] Hay backups y un runbook mínimo.

---

## 18. Orden de trabajo recomendado

1. **Fase 0:** esqueleto desplegable con `/api/health` y bootstrap.
2. **Fase 1:** esquema, repositorios, hashing y CLI de admin, con tests.
3. **Fase 2:** API completa, auth, CORS y tests de aislamiento.
4. **Fase 3–4:** shell, tema, login y CRUD de blogs.
5. **Fase 5–6:** artículos, editor e imágenes.
6. **Fase 7–8:** hardening, despliegue y documentación.
7. **Fase 9:** editor rich text, migración de contenido y nuevo contrato de la API.
8. **Fase 10:** imagen de portada y miniatura en el listado.
9. **Fase 11:** vídeos WebM con conversión en el navegador.

La razón del orden: el modelo de datos y la API son la fuente de verdad; la UI se construye sobre contratos probados. El aislamiento, el bloqueo de borrado y CORS se validan antes de que exista interfaz, para no arrastrar fallos de diseño.

**Flujo Git:** cada fase se trabaja en una rama `feat/<fase>` creada desde `develop`, con PR a `develop`. El despliegue a producción se hace con un PR de `develop` a `main`. No se hace commit directo a `main` ni a `develop`. Ver [`CONTRIBUTING.md`](../CONTRIBUTING.md).

---

## 19. Primeros comandos propuestos

El repositorio ya contiene `docs/`, así que el scaffold se hace en una carpeta temporal y se integra, o se inicializa manualmente:

```bash
# Opción A: scaffold oficial en una carpeta temporal
npm create cloudflare@latest -- ../blog-manager-scaffold --framework=react

# Opción B: inicialización manual dentro del repositorio
npm init -y
npm install react react-dom hono zod drizzle-orm
npm install -D vite @vitejs/plugin-react typescript @cloudflare/vite-plugin wrangler \
  drizzle-kit @cloudflare/vitest-plugin vitest tsx

npx wrangler d1 create blog-manager-db
npx wrangler r2 bucket create blog-manager-media
```

Después se reemplaza la estructura generada por la de `ARQUITECTURA.md` §4, se configura `wrangler.jsonc` y se implementa el endpoint `/api/health` como primera verificación.
