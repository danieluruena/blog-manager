# Blog Manager

Gestor administrativo multi-blog para páginas web. Cada blog tiene sus propios artículos y la API pública está aislada por blog.

- **Frontend:** React + Vite + TypeScript + Tailwind CSS + Tiptap.
- **Backend:** Hono + TypeScript sobre Cloudflare Workers.
- **Datos:** Cloudflare D1.
- **Imágenes:** Cloudflare R2.
- **Despliegue:** un único Worker en `*.workers.dev`.

## Estado

**Fase 9 — Usuarios y permisos.** La aplicación está publicada en `https://blog-manager.dennis14756.workers.dev` y los cambios se despliegan automáticamente al hacer merge a `main`. Incluye auto-registro con aprobación, permisos por blog (consulta o edición) y perfil propio.

Documentación:

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md)
- [`docs/PLAN_IMPLEMENTACION.md`](docs/PLAN_IMPLEMENTACION.md)
- [`docs/API.md`](docs/API.md) — endpoints, auth, CORS y ejemplos.
- [`docs/OPERACIONES.md`](docs/OPERACIONES.md) — deploy, backups, migraciones e incidentes.
- [`docs/RENDIMIENTO.md`](docs/RENDIMIENTO.md) — bundle y planes de consulta.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — flujo GitFlow.

## Requisitos

- Node.js 22 o superior.
- npm 11 o superior.
- Cuenta de Cloudflare (solo para crear D1/R2 remotos y desplegar).

## Instalación

```powershell
npm install
Copy-Item .dev.vars.example .dev.vars
```

`AUTH_PEPPER` es obligatorio para el login. Genera uno y pégalo en `.dev.vars`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```text
AUTH_PEPPER=<el-valor-generado>
```

No cambies el pepper después de crear usuarios: sus contraseñas dejarían de verificar. `.dev.vars` está ignorado por Git.

## Ejecutar en local

En este proyecto el **frontend y el backend se ejecutan juntos** gracias al plugin de Vite para Cloudflare: el mismo servidor de desarrollo sirve la SPA y expone el Worker en `/api/*`. No hace falta levantar dos terminales ni configurar un proxy.

### Opción A — Desarrollo (recomendada)

```powershell
npm run dev
```

- **SPA:** http://localhost:5173
- **API:** http://localhost:5173/api/health
- **HMR:** los cambios en React se reflejan sin recargar; los cambios en el Worker reinician el runtime local.
- **D1 y R2:** se emulan localmente en `.wrangler/state`.

`npm run dev` ejecuta antes `wrangler types` para generar `worker-configuration.d.ts`.

### Opción B — Worker/API con el build

Útil para probar el backend con los bindings locales y el último build del frontend:

```powershell
npm run build
npx wrangler dev --port 8787
```

- **App + API:** http://localhost:8787
- **API:** http://localhost:8787/api/health

`wrangler dev` reutiliza el build de `dist/`; si cambias el frontend, vuelve a ejecutar `npm run build`.

### Opción C — Build de producción en local

```powershell
npm run build
npm run preview
```

- **App + API:** http://localhost:4173

`npm run preview` sirve el build en el runtime de Workers, muy parecido a producción.

### Detener los servidores

`Ctrl + C` en la terminal donde esté corriendo el comando.

## D1 y R2 en local

- D1 y R2 se emulan automáticamente; **no necesitas `wrangler login` para desarrollar**.
- El `database_id` placeholder de `wrangler.jsonc` es suficiente para local.

### Preparar la base de datos local

```powershell
npx wrangler d1 migrations apply blog-manager-db --local
npm run db:seed
```

`db:seed` carga 2 blogs y 8 artículos de ejemplo con estados variados. Es idempotente: puedes ejecutarlo varias veces sin duplicar los datos.

### Imágenes y vídeos en R2

- El navegador optimiza cada imagen antes de subirla: la convierte a **WebP**, limita el lado mayor a **2560 px** y usa calidad **0.75**. Se aceptan como origen JPEG, PNG, WebP y AVIF de hasta 20 MB (sin GIF animado); el WebP final no puede superar 5 MB.
- Los vídeos se convierten a **WebM (VP9/VP8 + Opus)** en el navegador con Mediabunny y WebCodecs. Se aceptan MP4, MOV, WebM/MKV, OGG y TS de hasta 250 MB; el lado mayor se limita a 1920 px, el audio a 128 kbps y el WebM final a 50 MB. Requiere un navegador con WebCodecs (Chrome, Edge o Safari actualizado).
- El vídeo original aparece **de inmediato** en el editor y se optimiza en segundo plano mientras sigues editando. El aviso de progreso permite **cancelar** la optimización; si lo haces, el vídeo se retira del artículo y se avisa de que todos los vídeos e imágenes deben estar optimizados antes de guardar. Mientras haya optimizaciones pendientes no se puede guardar.
- Puedes pegar o arrastrar imágenes **y vídeos** directamente en el editor; mientras editas se muestran en local con URLs `blob:` y **solo se suben a R2 al guardar el artículo**, únicamente los que sigan presentes en el documento.
- Cada artículo puede tener una **imagen de portada** con previsualización. Usa el mismo pipeline: se optimiza en el navegador y se sube al guardar. Aparece junto al título en el listado y en el campo `coverImage` de la API.
- Cada archivo pertenece a un artículo y es un objeto independiente en R2. Si quitas una imagen, un vídeo o la portada y guardas, se elimina de R2 y de D1. No se puede reutilizar la URL de un archivo de otro artículo.
- Límites y endpoints en [`docs/API.md`](docs/API.md#imágenes-y-vídeos).
- En local los objetos se guardan en `.wrangler/state/v3/r2`; al borrar un artículo o un blog sin artículos se limpian también sus archivos.

### Crear un usuario administrador local

```powershell
npm run user:create -- --email tu@email.com --name "Tu Nombre"
```

El comando pide la contraseña de forma interactiva (mínimo 12 caracteres) y lee `AUTH_PEPPER` de `.dev.vars`. Los usuarios creados por CLI quedan **aprobados**. Para automatizarlo:

```powershell
$env:ADMIN_PASSWORD = "una-contraseña-larga"
npm run user:create -- --email tu@email.com --name "Tu Nombre"
Remove-Item Env:ADMIN_PASSWORD
```

### Usuarios, aprobación y permisos

- Cualquiera puede crear una cuenta en `/register` con nombre, email y contraseña. Queda **pendiente de aprobación** y no puede iniciar sesión: el login responde `Usuario pendiente de aprobación`.
- Un administrador ve las cuentas en `/users`, puede crearlas, editarlas, aprobarlas y eliminarlas. Para aprobar a un editor debe asignarle **al menos un permiso de blog**: `read` (consulta) o `write` (edición).
- Los administradores tienen acceso completo a todos los blogs y a la gestión de usuarios; no necesitan filas de permisos.
- Los editores solo ven los blogs asignados. Con `read` pueden consultar blogs y artículos; con `write` también crean, editan y borran artículos y suben media.
- Retirar la aprobación o desactivar una cuenta invalida sus sesiones activas.
- Todos los usuarios, incluido el administrador, tienen `/profile` para cambiar su nombre y contraseña. El cambio de contraseña exige la contraseña actual, mantiene la sesión actual y revoca las demás.

Para crear los recursos remotos y desplegar sí necesitas autenticarte:

```powershell
npx wrangler login
npx wrangler secret put AUTH_PEPPER
```

> Guarda el valor de `AUTH_PEPPER` en un lugar seguro. Para crear un administrador remoto necesitas pasar el **mismo** valor:
>
> ```powershell
> $env:AUTH_PEPPER = "el-mismo-valor-del-secret"
> npm run user:create -- --email tu@email.com --name "Tu Nombre" --remote
> Remove-Item Env:AUTH_PEPPER
> ```

## Interfaz

Rutas principales:

| Ruta                                 | Pantalla                                 |
| ------------------------------------ | ---------------------------------------- |
| `/login`                             | Inicio de sesión                         |
| `/register`                          | Auto-registro de cuenta                  |
| `/`                                  | Panel con métricas (solo administrador)  |
| `/blogs`                             | Lista de blogs (filtrada por permisos)   |
| `/blogs/:blogId/articles`            | Lista y filtros de artículos             |
| `/blogs/:blogId/articles/new`        | Editor de un artículo nuevo              |
| `/blogs/:blogId/articles/:articleId` | Edición o lectura de un artículo         |
| `/blogs/:blogId/settings`            | Ajustes del blog (solo administrador)    |
| `/users`                             | Gestión de usuarios (solo administrador) |
| `/profile`                           | Perfil propio: nombre y contraseña       |

El editor de artículos usa **Tiptap** con carga diferida. Guarda el documento JSON en `body_json` y el servidor genera el HTML que sirve la API pública. Permite familias tipográficas, tamaños, colores, resaltado, alineación, enlaces, imágenes, vídeos, listas, citas y código. Las imágenes y los vídeos se previsualizan en local y se suben a R2 al guardar el artículo. El formulario incluye además una portada con previsualización que se muestra junto al título en el listado.

El editor ofrece un catálogo de **106 Google Fonts populares** con buscador, agrupadas en sans, serif, display, mono y manuscritas, además de alternativas del sistema. Las fuentes se cargan bajo demanda: solo se descarga la que se usa o se previsualiza.

## API

La API HTTP está implementada. Documentación completa en [`docs/API.md`](docs/API.md).

| Zona           | Base             | Autenticación               |
| -------------- | ---------------- | --------------------------- |
| Auth           | `/api/auth`      | Cookie de sesión            |
| Administración | `/api/admin`     | Cookie de sesión            |
| Pública        | `/api/public/v1` | Sin auth, con CORS por blog |

Prueba rápida en local:

```powershell
# Login (guarda la cookie)
curl.exe -i -c cookies.txt `
  -H "Content-Type: application/json" `
  --data-raw '{"email":"tu@email.com","password":"tu-contraseña"}' `
  http://localhost:5173/api/auth/login

# Blogs del panel
curl.exe -b cookies.txt http://localhost:5173/api/admin/blogs

# API pública del blog de ejemplo
curl.exe "http://localhost:5173/api/public/v1/blogs/pagina-a/articles"
```

La API pública solo devuelve blogs activos y artículos `published` o `featured`. CORS permite el origen de `siteUrl` y los orígenes configurados en `allowedOrigins`.

## Tests y calidad

```powershell
npm run test       # tests dentro del runtime de Workers
npm run check      # typecheck + lint + tests + build
npm run format     # Prettier sobre el código
```

La suite incluye 107 tests de integración y unitarios. La interfaz se auditó con
axe (WCAG 2 A/AA) en login, panel, blogs, artículos y editor sin violaciones
detectadas.

## CI

Cada pull request ejecuta automáticamente:

1. `npm ci`
2. `npm run format:check`
3. `npm run lint`
4. `npm run test`
5. `npm run build`

Workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

Al hacer merge a `main`, [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
aplica las migraciones de D1 y despliega el Worker. Requiere los secretos
`CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` en el entorno `production` de
GitHub. Las migraciones también se pueden lanzar a mano con
[`.github/workflows/migrate.yml`](.github/workflows/migrate.yml).

## Scripts

| Comando                    | Descripción                                              |
| -------------------------- | -------------------------------------------------------- |
| `npm run dev`              | Servidor de desarrollo (SPA + Worker).                   |
| `npm run build`            | Typecheck y build de producción.                         |
| `npm run preview`          | Previsualiza el build en el runtime de Workers.          |
| `npm run typecheck`        | TypeScript en modo estricto.                             |
| `npm run lint`             | ESLint.                                                  |
| `npm run format`           | Prettier.                                                |
| `npm run test`             | Tests con Vitest dentro del runtime de Workers.          |
| `npm run check`            | Typecheck + lint + tests + build.                        |
| `npm run audit`            | Auditoría de dependencias de producción.                 |
| `npm run cf-typegen`       | Genera `worker-configuration.d.ts`.                      |
| `npm run bootstrap`        | Crea D1 y R2 y actualiza `wrangler.jsonc`.               |
| `npm run db:seed`          | Carga datos de ejemplo y los convierte a rich text.      |
| `npm run articles:convert` | Convierte a rich text los artículos locales en markdown. |
| `npm run user:create`      | Crea un usuario administrador o editor.                  |
| `npm run deploy`           | Build y despliegue a Cloudflare.                         |

## Cloudflare remoto

`worker-configuration.d.ts` se genera automáticamente con `npm run cf-typegen` (también se ejecuta antes de `dev`, `build`, `test` y `typecheck`). No se versiona.

El bootstrap requiere autenticación de Wrangler:

```powershell
npx wrangler login
npm run bootstrap
```

El `database_id` de `wrangler.jsonc` es un placeholder hasta ejecutar el bootstrap. Para producción:

```powershell
npm run bootstrap
npx wrangler d1 migrations apply blog-manager-db --remote
npm run user:create -- --email tu@email.com --name "Tu Nombre" --remote
npm run deploy
```

## Problemas comunes

- **Puerto ocupado:** Vite elige el siguiente puerto (5174, 5175...). Para fijarlo: `npm run dev -- --port 5174`.
- **`worker-configuration.d.ts` no existe:** ejecuta `npm run cf-typegen`; también se genera solo antes de `dev`, `build`, `test` y `typecheck`.
- **`No such table`:** aplica las migraciones locales cuando existan: `npx wrangler d1 migrations apply blog-manager-db --local`.
- **No responde `/api/health`:** comprueba que el servidor de Vite sigue activo y que estás usando el puerto correcto.
- **`/api/health` devuelve HTML o el Worker deja de responder tras cambiar configuración:** detén el servidor y vuelve a ejecutar `npm run dev`; el plugin de Cloudflare reconstruye el entorno del Worker.
- **Quiero probar endpoints del backend:** usa la Opción B y llama a `http://localhost:8787/api/...`.

## Estructura

```text
src/
  client/   SPA React
  server/   API Hono para Workers
  shared/   tipos y esquemas compartidos
scripts/    bootstrap y utilidades de administración
tests/      tests de API y unitarios
migrations/ migraciones D1
docs/       arquitectura y plan
```

## Flujo de trabajo

- `main`: producción.
- `develop`: integración.
- `feat/<slug>` y `fix/<slug>`: ramas de trabajo desde `develop`, con PR a `develop`.
- El despliegue a producción se hace con un PR de `develop` a `main`.

Ver [`CONTRIBUTING.md`](CONTRIBUTING.md).
