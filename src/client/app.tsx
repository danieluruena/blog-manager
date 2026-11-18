import { useEffect, useState } from "react";

import type { HealthResponse } from "@shared/types";

type HealthState =
  | { status: "loading" }
  | { status: "ok"; data: HealthResponse }
  | { status: "error"; message: string };

const navigation = [
  { label: "Panel", active: true },
  { label: "Blogs", active: false },
  { label: "Ajustes", active: false },
];

const nextSteps = [
  "Configurar D1 y R2 con `npm run bootstrap`.",
  "Crear el esquema de blogs, artículos y usuarios.",
  "Implementar login y sesiones.",
  "Construir el CRUD de blogs y el editor markdown.",
];

export function App() {
  const [health, setHealth] = useState<HealthState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/health", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`La API respondió con HTTP ${response.status}`);
        }

        return (await response.json()) as HealthResponse;
      })
      .then((data) => {
        setHealth({ status: "ok", data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setHealth({
          status: "error",
          message: error instanceof Error ? error.message : "Error desconocido",
        });
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface/70 px-5 py-6 lg:flex">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg border border-line bg-surface-2 font-mono text-xs font-semibold text-accent">
              BM
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">Blog Manager</p>
              <p className="text-xs text-muted">Administración editorial</p>
            </div>
          </div>

          <nav className="mt-10 space-y-1" aria-label="Navegación principal">
            {navigation.map((item) => (
              <div
                key={item.label}
                className={
                  item.active
                    ? "flex items-center justify-between rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink"
                    : "flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted"
                }
              >
                <span>{item.label}</span>
                {!item.active ? (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted/60">
                    Pronto
                  </span>
                ) : null}
              </div>
            ))}
          </nav>

          <div className="mt-auto rounded-xl border border-line bg-surface-2/60 p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Estado del proyecto
            </p>
            <p className="mt-2 text-sm font-medium">Fase 0 · Fundaciones</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Scaffold, tema base y endpoint de salud listos.
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-line px-5 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-md border border-line bg-surface-2 font-mono text-[10px] text-accent lg:hidden">
                BM
              </div>
              <p className="text-sm text-muted">
                <span className="text-ink">Blog Manager</span>
                <span className="mx-2 text-line">/</span>
                Fundaciones
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden font-mono text-[10px] uppercase tracking-widest text-muted sm:inline">
                v0.1.0
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted">
                <span
                  className={
                    health.status === "ok"
                      ? "size-1.5 rounded-full bg-success"
                      : health.status === "error"
                        ? "size-1.5 rounded-full bg-danger"
                        : "size-1.5 animate-pulse rounded-full bg-warning"
                  }
                />
                {health.status === "ok"
                  ? "API conectada"
                  : health.status === "error"
                    ? "API sin conexión"
                    : "Comprobando API"}
              </span>
            </div>
          </header>

          <main className="flex-1 overflow-auto px-5 py-8 lg:px-10 lg:py-12">
            <div className="mx-auto max-w-5xl space-y-10">
              <section className="max-w-3xl">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
                  Fase 0 · Fundaciones
                </p>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                  Base lista para construir el gestor de blogs.
                </h1>
                <p className="mt-4 text-base leading-7 text-muted">
                  React + Vite sirviendo la interfaz, Hono respondiendo en Workers y la
                  configuración de D1, R2 y assets preparada para las siguientes fases.
                </p>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <article className="rounded-2xl border border-line bg-surface p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                        Endpoint de salud
                      </p>
                      <p className="mt-2 font-mono text-sm text-ink">GET /api/health</p>
                    </div>
                    <span
                      className={
                        health.status === "ok"
                          ? "rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success"
                          : health.status === "error"
                            ? "rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 text-[11px] font-medium text-danger"
                            : "rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning"
                      }
                    >
                      {health.status === "ok"
                        ? "200 OK"
                        : health.status === "error"
                          ? "Error"
                          : "Cargando"}
                    </span>
                  </div>

                  <div className="mt-5 rounded-xl border border-line bg-canvas p-4 font-mono text-xs leading-6 text-muted">
                    {health.status === "ok" ? (
                      <pre className="overflow-x-auto text-ink">
                        {JSON.stringify(health.data, null, 2)}
                      </pre>
                    ) : health.status === "error" ? (
                      <p className="text-danger">{health.message}</p>
                    ) : (
                      <p>Esperando respuesta del Worker…</p>
                    )}
                  </div>
                </article>

                <article className="rounded-2xl border border-line bg-surface p-5">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    Stack activo
                  </p>
                  <ul className="mt-4 space-y-3 text-sm">
                    {[
                      ["Frontend", "React + Vite + Tailwind"],
                      ["Backend", "Hono sobre Cloudflare Workers"],
                      ["Datos", "D1 · pendiente de bootstrap"],
                      ["Imágenes", "R2 · pendiente de bootstrap"],
                    ].map(([label, value]) => (
                      <li
                        key={label}
                        className="flex items-baseline justify-between gap-4 border-b border-line/70 pb-3 last:border-0 last:pb-0"
                      >
                        <span className="text-muted">{label}</span>
                        <span className="text-right text-ink">{value}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </section>

              <section className="rounded-2xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                      Siguiente
                    </p>
                    <h2 className="mt-1 text-lg font-semibold tracking-tight">
                      Lo que viene en la Fase 1
                    </h2>
                  </div>
                  <span className="hidden rounded-full border border-line bg-surface-2 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted sm:inline">
                    Checklist
                  </span>
                </div>

                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {nextSteps.map((step, index) => (
                    <li
                      key={step}
                      className="flex gap-3 rounded-xl border border-line bg-canvas/60 p-3 text-sm text-muted"
                    >
                      <span className="grid size-6 shrink-0 place-items-center rounded-md border border-line bg-surface-2 font-mono text-[10px] text-accent">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="leading-6">{step}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <p className="text-xs leading-6 text-muted">
                Documentación: <span className="font-mono text-ink">docs/ARQUITECTURA.md</span> y{" "}
                <span className="font-mono text-ink">docs/PLAN_IMPLEMENTACION.md</span>.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
