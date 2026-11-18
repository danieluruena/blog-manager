# Contribución y flujo Git

Este repositorio sigue un flujo tipo **GitFlow simplificado**.

## Ramas

| Rama          | Propósito           | Despliegue                            |
| ------------- | ------------------- | ------------------------------------- |
| `main`        | Producción          | Sí, al recibir un PR desde `develop`. |
| `develop`     | Integración         | Preview/staging (cuando exista).      |
| `feat/<slug>` | Nueva funcionalidad | Preview de la PR (opcional).          |
| `fix/<slug>`  | Corrección          | Preview de la PR (opcional).          |

## Reglas

- No se hace commit directo a `main` ni a `develop`.
- Toda rama de trabajo nace de `develop`.
- Los PRs de trabajo van **siempre a `develop`**.
- Para producción se abre un PR de `develop` a `main`.
- Solo se mergea con CI verde y revisión (aunque sea una autoevaluación).
- Mantén las ramas cortas; antes del PR, actualízalas con `develop`.
- Política de merge recomendada: **squash** para `feat/*` y `fix/*`, para mantener `develop` legible.
- Etiquetar releases en `main`: `v0.1.0`, `v0.2.0`, etc.

## Nombres de rama

- `feat/blog-crud`
- `feat/article-editor`
- `feat/r2-image-upload`
- `fix/cors-public-api`
- `fix/session-expiry`

## Commits

Se usa **Conventional Commits**:

- `feat: ...`
- `fix: ...`
- `docs: ...`
- `test: ...`
- `refactor: ...`
- `chore: ...`

## Flujo típico

```bash
git checkout develop
git pull origin develop
git checkout -b feat/mi-cambio

# trabajar

git add .
git commit -m "feat: ..."
git push -u origin feat/mi-cambio
gh pr create --base develop --head feat/mi-cambio
```

Para desplegar a producción:

```bash
gh pr create --base main --head develop --title "release: v0.1.0"
```

## Despliegue

- `develop` → entorno de preview/staging (cuando exista).
- `main` → producción (`wrangler deploy` vía CI).
- Las migraciones de D1 se ejecutan con un workflow manual aprobado; no se aplican automáticamente en cada deploy.
