# Blog Manager

Gestor administrativo multi-blog para páginas web. Cada blog tiene sus propios artículos y la API pública está aislada por blog.

- **Frontend:** React + Vite + TypeScript + Tailwind CSS.
- **Backend:** Hono + TypeScript sobre Cloudflare Workers.
- **Datos:** Cloudflare D1.
- **Imágenes:** Cloudflare R2.
- **Despliegue:** un único Worker en `*.workers.dev`.

## Estado

**Fase 0 — Fundaciones.** La SPA, el Worker, `/api/health`, el tema base y la configuración de Cloudflare están listos. El CRUD, la autenticación y el editor llegan en las siguientes fases.

Documentación:

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md)
- [`docs/PLAN_IMPLEMENTACION.md`](docs/PLAN_IMPLEMENTACION.md)
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — flujo GitFlow.

## Requisitos

- Node.js 22 o superior.
- npm 11 o superior.
- Cuenta de Cloudflare (para crear D1/R2 y desplegar).

## Instalación

```bash
npm install
cp .dev.vars.example .dev.vars
```

En Windows (PowerShell):

```powershell
Copy-Item .dev.vars.example .dev.vars
```

## Desarrollo

```bash
npm run dev
```

Vite arranca la SPA y el Worker con el plugin de Cloudflare. La API de salud está en `http://localhost:5173/api/health`.

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
| `npm run bootstrap`   | Crea D1 y R2 y actualiza `wrangler.jsonc`.      |
| `npm run user:create` | Crea el primer administrador (Fase 1).          |
| `npm run deploy`      | Build y despliegue a Cloudflare.                |

## Cloudflare

`worker-configuration.d.ts` se genera automáticamente con `npm run cf-typegen` (también se ejecuta antes de `dev`, `build`, `test` y `typecheck`). No se versiona.

El bootstrap requiere autenticación de Wrangler:

```bash
npx wrangler login
npm run bootstrap
npx wrangler d1 migrations apply blog-manager-db --local
npm run dev
```

El `database_id` de `wrangler.jsonc` es un placeholder hasta ejecutar el bootstrap. Para producción:

```bash
npm run bootstrap
npx wrangler d1 migrations apply blog-manager-db --remote
npm run user:create -- --email tu@email.com --name "Tu Nombre" --remote
npm run deploy
```

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
