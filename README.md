# Blog Manager

Gestor administrativo multi-blog para páginas web. Cada blog tiene sus propios artículos y la API pública está aislada por blog.

- **Frontend:** React + Vite + TypeScript + Tailwind CSS.
- **Backend:** Hono + TypeScript sobre Cloudflare Workers.
- **Datos:** Cloudflare D1.
- **Imágenes:** Cloudflare R2.
- **Despliegue:** un único Worker en `*.workers.dev`.

## Estado

**Fase 1 — Modelo de datos.** La SPA, el Worker, `/api/health`, el tema base, el esquema D1, las migraciones, los repositorios, el seed y la CLI de administración están listos. La API y la UI del CRUD llegan en las siguientes fases.

Documentación:

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md)
- [`docs/PLAN_IMPLEMENTACION.md`](docs/PLAN_IMPLEMENTACION.md)
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

`.dev.vars` es opcional en desarrollo local: no hay secretos obligatorios todavía. Está ignorado por Git.

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

### Crear un usuario administrador local

```powershell
npm run user:create -- --email tu@email.com --name "Tu Nombre"
```

El comando pide la contraseña de forma interactiva (mínimo 12 caracteres). Para automatizarlo:

```powershell
$env:ADMIN_PASSWORD = "una-contraseña-larga"
npm run user:create -- --email tu@email.com --name "Tu Nombre"
Remove-Item Env:ADMIN_PASSWORD
```

Para crear los recursos remotos y desplegar sí necesitas autenticarte:

```powershell
npx wrangler login
```

## Tests y calidad

```powershell
npm run test       # tests dentro del runtime de Workers
npm run check      # typecheck + lint + tests + build
npm run format     # Prettier sobre el código
```

## Scripts

| Comando               | Descripción                                     |
| --------------------- | ----------------------------------------------- |
| `npm run dev`         | Servidor de desarrollo (SPA + Worker).          |
| `npm run build`       | Typecheck y build de producción.                |
| `npm run preview`     | Previsualiza el build en el runtime de Workers. |
| `npm run typecheck`   | TypeScript en modo estricto.                    |
| `npm run lint`        | ESLint.                                         |
| `npm run format`      | Prettier.                                       |
| `npm run test`        | Tests con Vitest dentro del runtime de Workers. |
| `npm run check`       | Typecheck + lint + tests + build.               |
| `npm run audit`       | Auditoría de dependencias de producción.        |
| `npm run cf-typegen`  | Genera `worker-configuration.d.ts`.             |
| `npm run bootstrap`   | Crea D1 y R2 y actualiza `wrangler.jsonc`.      |
| `npm run db:seed`     | Carga datos de ejemplo en D1 local.             |
| `npm run user:create` | Crea un usuario administrador o editor.         |
| `npm run deploy`      | Build y despliegue a Cloudflare.                |

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
