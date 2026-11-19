# Operaciones — Blog Manager

Guía para desplegar, hacer copias de seguridad, migrar y resolver incidentes.

## Entornos

| Entorno    | URL                                            | Datos                          |
| ---------- | ---------------------------------------------- | ------------------------------ |
| Local      | `http://localhost:5173`                        | D1 y R2 emulados por Wrangler  |
| Producción | `https://<worker>.<subdominio>.workers.dev`    | D1 y R2 reales                 |

El despliegue en producción está pendiente de `npx wrangler login`; los recursos
remotos no se crean en local.

## Despliegue

1. Autenticarse: `npx wrangler login`.
2. Crear recursos: `npm run bootstrap` (D1, R2 y `database_id` en `wrangler.jsonc`).
3. Configurar el secreto: `npx wrangler secret put AUTH_PEPPER` (mínimo 32 caracteres).
4. Aplicar migraciones: `npm run db:migrate:remote`.
5. Crear el administrador inicial:

   ```powershell
   $env:AUTH_PEPPER = "<el mismo del worker>"
   $env:ADMIN_PASSWORD = "<contraseña temporal>"
   npm run user:create -- --remote --email tu@email.com --name "Tu Nombre"
   Remove-Item Env:AUTH_PEPPER, Env:ADMIN_PASSWORD
   ```

6. Desplegar: `npm run deploy`.
7. Smoke test: login, crear blog, crear artículo, subir imagen, publicar,
   consultar la API pública desde un origen permitido y comprobar el bloqueo de
   borrado con artículos.

## CI

GitHub Actions ejecuta en cada PR:

1. `npm run format:check`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

Los tests no necesitan `.dev.vars`: el `AUTH_PEPPER` de prueba se define en
`vitest.config.ts`.

## Migraciones

- Local: `npm run db:migrate:local`.
- Remoto: `npm run db:migrate:remote`.
- Son **solo hacia delante**. Antes de una migración remota, exporta D1.
- Para revertir, restaura la copia de seguridad y despliega la versión anterior
  del Worker.

## Copias de seguridad

### D1

```powershell
npx wrangler d1 export blog-manager-db --remote --output backups/d1-<fecha>.sql
```

En local omite `--remote`.

- Haz copia antes de cada migración y, como mínimo, una vez al día.
- Guarda el `.sql` fuera del repositorio.

### R2

Los objetos no se modifican (claves UUID), pero conviene copiarlos:

```powershell
# Ejemplo con rclone configurado contra el endpoint S3 de R2
rclone sync r2:blog-manager-media backups/r2/blog-manager-media
```

También puedes descargar objetos concretos con `npx wrangler r2 object get`.

### Restauración de D1 (probada)

1. Crea o vacía la base de datos de destino.
2. Importa el dump:

   ```powershell
   npx wrangler d1 execute blog-manager-db --remote --file backups/d1-<fecha>.sql
   ```

3. Verifica `users`, `blogs`, `articles` y `media`.

El dump desactiva/defiere claves foráneas y crea las tablas en un orden que no
respeta dependencias, así que al restaurar con SQLite directamente hay que abrir
la conexión con `PRAGMA foreign_keys = OFF`. Prueba local realizada con Node 22
(`node:sqlite`): 2 usuarios, 3 blogs, 8 artículos, 2 medios y 2 migraciones.

## Recuperación de acceso

- **Nuevo administrador:** `npm run user:create -- --remote --email ...` con un
  email distinto (el comando no actualiza usuarios existentes).
- **Revocar sesiones de un usuario:**

  ```sql
  DELETE FROM sessions WHERE user_id = '<id>';
  ```

- **Resetear la contraseña de un email existente:** elimina el usuario y vuelve
  a crearlo. No hay artículos que referencien `users.id`, así que es seguro;
  las sesiones se borran en cascada.

- **Bloqueo por intentos fallidos:** espera 15 minutos o elimina su fila de
  `auth_attempts`. Las claves son hashes de IP/email.

## Rollback

1. Worker: `npx wrangler versions list` y `npx wrangler rollback <version-id>`,
   o despliega el commit anterior.
2. D1: restaura el dump previo a la migración.
3. R2: los objetos son inmutables; no hace falta revertirlos.

## Observabilidad

- Logs JSON por petición: `level`, `requestId`, `method`, `path`, `status`,
  `durationMs` y `rayId`.
- `4xx` se registran como `warn`; `5xx` como `error`.
- La respuesta incluye `X-Request-Id` para correlacionar con los logs.
- En producción: `npx wrangler tail`.

## Checklist de seguridad aplicado

- [x] Sesiones opacas de 32 bytes, guardadas como SHA-256; expiran a los 7 días.
- [x] Cookie `HttpOnly`, `SameSite=Strict`, `Secure` en HTTPS y `Path=/`.
- [x] Contraseñas con HMAC-SHA256 + salt + `AUTH_PEPPER` (compatible con CPU gratuita).
- [x] Rate limit de login: 5 intentos / 15 minutos por IP y email.
- [x] Errores de login genéricos y verificación de hash también para usuarios inexistentes.
- [x] Revocación de sesiones al cambiar contraseña y al cerrar sesión.
- [x] CSRF: `SameSite=Strict` + validación de `Origin` en mutaciones.
- [x] CORS por blog con lista de orígenes, `Vary: Origin`, sin credenciales.
- [x] Rutas de administración protegidas con `requireAuth`; acciones destructivas con `requireAdmin`.
- [x] Uploads: 5 MB, MIME permitido, bytes mágicos, `nosniff` y SVG rechazado.
- [x] Cabeceras: CSP, HSTS (HTTPS), `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- [x] Sin secretos en el repositorio; `AUTH_PEPPER` es un secret del Worker.
- [x] Sin estado global mutable en el Worker; base de datos por petición.

### Limitaciones conocidas

- Las fuentes se cargan desde Google Fonts; la CSP lo permite explícitamente.
- La CSP usa `style-src 'unsafe-inline'` porque Radix y otros componentes usan
  atributos `style`. Los scripts no admiten `unsafe-inline` en producción.
- No hay CLI de reseteo de contraseña (ver procedimiento arriba).
- Una subida que falla después de guardar la imagen puede dejar un medio sin
  asignar; se limpia al borrar el blog. Se puede añadir un cron en el futuro.
- El borrado de un blog con artículos está bloqueado por diseño.

## Incidentes

| Síntoma                         | Acción                                                                 |
| ------------------------------- | ---------------------------------------------------------------------- |
| 5xx repetidos                   | Buscar `requestId` en `wrangler tail`; rollback si empezó tras deploy. |
| Login bloqueado                 | Esperar 15 min o limpiar `auth_attempts` del usuario.                  |
| Sesión comprometida             | Borrar sesiones del usuario y cambiar la contraseña.                   |
| `AUTH_PEPPER` comprometido      | Rotarlo invalida todos los hashes: crear administradores nuevos.       |
| Imágenes no cargan              | Comprobar `GET /media/<blogId>/<archivo>` y el binding `MEDIA`.        |
| Migración fallida               | Restaurar el dump previo y desplegar la versión anterior.              |
