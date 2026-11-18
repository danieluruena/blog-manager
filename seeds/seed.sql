-- Datos de ejemplo para desarrollo local.
-- Ejecutar con: npm run db:seed
-- No aplicar en producción.

INSERT OR IGNORE INTO blogs (
  id, name, slug, description, site_url, allowed_origins, is_active, created_at, updated_at
) VALUES (
  'b0000001-0000-4000-8000-000000000001',
  'Blog de la Página A',
  'pagina-a',
  'Noticias, guías y artículos de la Página A.',
  'https://pagina-a.example',
  '',
  1,
  '2026-11-01T08:00:00.000Z',
  '2026-11-01T08:00:00.000Z'
);

INSERT OR IGNORE INTO blogs (
  id, name, slug, description, site_url, allowed_origins, is_active, created_at, updated_at
) VALUES (
  'b0000002-0000-4000-8000-000000000002',
  'Blog de la Página B',
  'pagina-b',
  'Contenido y novedades de la Página B.',
  'https://pagina-b.example',
  '',
  1,
  '2026-11-01T08:30:00.000Z',
  '2026-11-01T08:30:00.000Z'
);

INSERT OR IGNORE INTO articles (
  id, blog_id, title, slug, excerpt, author, body, status, created_at, published_at, updated_at
) VALUES (
  'a0000001-0000-4000-8000-000000000001',
  'b0000001-0000-4000-8000-000000000001',
  'Bienvenido al blog de la Página A',
  'bienvenido-pagina-a',
  'Una introducción a lo que encontrarás en este blog.',
  'Daniel Urueña',
  '## Bienvenido

Este es el primer artículo de ejemplo de la Página A.

- Contenido editorial en markdown.
- Estados de publicación.
- Imágenes y enlaces.

> Este blog forma parte del gestor multi-blog.

![Imagen de ejemplo](https://placehold.co/1200x630)
',
  'published',
  '2026-11-02T09:00:00.000Z',
  '2026-11-10T09:00:00.000Z',
  '2026-11-10T09:00:00.000Z'
);

INSERT OR IGNORE INTO articles (
  id, blog_id, title, slug, excerpt, author, body, status, created_at, published_at, updated_at
) VALUES (
  'a0000002-0000-4000-8000-000000000002',
  'b0000001-0000-4000-8000-000000000001',
  'Guía rápida de markdown',
  'guia-rapida-markdown',
  'Los elementos de markdown que más vas a usar al escribir.',
  'Daniel Urueña',
  '## Markdown esencial

### Títulos

Usa `##` para los títulos de sección.

### Listas

1. Primer paso.
2. Segundo paso.
3. Tercer paso.

### Enlaces e imágenes

Puedes enlazar a [cualquier sitio](https://example.com) e incluir imágenes:

![Texto alternativo](https://placehold.co/1200x630)
',
  'featured',
  '2026-11-03T10:00:00.000Z',
  '2026-11-12T10:00:00.000Z',
  '2026-11-12T10:00:00.000Z'
);

INSERT OR IGNORE INTO articles (
  id, blog_id, title, slug, excerpt, author, body, status, created_at, published_at, updated_at
) VALUES (
  'a0000003-0000-4000-8000-000000000003',
  'b0000001-0000-4000-8000-000000000001',
  'Borrador de lanzamiento',
  'borrador-lanzamiento',
  'Un borrador que todavía no está listo para publicarse.',
  'Daniel Urueña',
  '## Borrador

Este artículo está en estado `draft` y no debe aparecer en la API pública.

- Revisar el texto.
- Añadir imágenes.
- Elegir fecha de publicación.
',
  'draft',
  '2026-11-05T11:00:00.000Z',
  NULL,
  '2026-11-05T11:00:00.000Z'
);

INSERT OR IGNORE INTO articles (
  id, blog_id, title, slug, excerpt, author, body, status, created_at, published_at, updated_at
) VALUES (
  'a0000004-0000-4000-8000-000000000004',
  'b0000001-0000-4000-8000-000000000001',
  'Artículo oculto',
  'articulo-oculto',
  'Contenido retirado temporalmente del blog.',
  'Daniel Urueña',
  '## Contenido oculto

Este artículo está en estado `hidden`: existe en el panel, pero no se sirve públicamente.
',
  'hidden',
  '2026-10-01T09:00:00.000Z',
  '2026-10-02T09:00:00.000Z',
  '2026-10-02T09:00:00.000Z'
);

INSERT OR IGNORE INTO articles (
  id, blog_id, title, slug, excerpt, author, body, status, created_at, published_at, updated_at
) VALUES (
  'a0000005-0000-4000-8000-000000000005',
  'b0000002-0000-4000-8000-000000000002',
  'Novedades de la Página B',
  'novedades-pagina-b',
  'Un resumen de las últimas novedades.',
  'Daniel Urueña',
  '## Novedades

Este es el primer artículo de la Página B.

La API pública del blog A no debe devolver este contenido.
',
  'published',
  '2026-11-02T09:30:00.000Z',
  '2026-11-11T09:30:00.000Z',
  '2026-11-11T09:30:00.000Z'
);

INSERT OR IGNORE INTO articles (
  id, blog_id, title, slug, excerpt, author, body, status, created_at, published_at, updated_at
) VALUES (
  'a0000006-0000-4000-8000-000000000006',
  'b0000002-0000-4000-8000-000000000002',
  'Cómo organizamos el contenido',
  'como-organizamos-el-contenido',
  'Un artículo destacado sobre nuestro proceso editorial.',
  'Daniel Urueña',
  '## Proceso editorial

1. Investigar.
2. Escribir.
3. Revisar.
4. Publicar.

Este artículo está marcado como `featured`.
',
  'featured',
  '2026-11-03T10:30:00.000Z',
  '2026-11-13T10:30:00.000Z',
  '2026-11-13T10:30:00.000Z'
);

INSERT OR IGNORE INTO articles (
  id, blog_id, title, slug, excerpt, author, body, status, created_at, published_at, updated_at
) VALUES (
  'a0000007-0000-4000-8000-000000000007',
  'b0000002-0000-4000-8000-000000000002',
  'Notas internas',
  'notas-internas',
  'Notas que no deben publicarse.',
  'Daniel Urueña',
  '## Notas

Borrador interno de la Página B.
',
  'draft',
  '2026-11-05T11:30:00.000Z',
  NULL,
  '2026-11-05T11:30:00.000Z'
);

INSERT OR IGNORE INTO articles (
  id, blog_id, title, slug, excerpt, author, body, status, created_at, published_at, updated_at
) VALUES (
  'a0000008-0000-4000-8000-000000000008',
  'b0000002-0000-4000-8000-000000000002',
  'Contenido archivado',
  'contenido-archivado',
  'Un artículo antiguo que ya no se muestra.',
  'Daniel Urueña',
  '## Archivo

Contenido conservado pero oculto.
',
  'hidden',
  '2026-09-20T09:00:00.000Z',
  '2026-09-21T09:00:00.000Z',
  '2026-09-21T09:00:00.000Z'
);
