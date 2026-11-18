import { spawnSync } from "node:child_process"

export type WranglerResult = {
  status: number | null
  stdout: string
  stderr: string
}

export function runWrangler(args: string[], cwd = process.cwd()): WranglerResult {
  const result = spawnSync("npx", ["--no-install", "wrangler", ...args], {
    cwd,
    encoding: "utf8",
    shell: true,
    env: process.env,
  })

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  }
}

export function assertWranglerAuthenticated(cwd = process.cwd()): void {
  const result = runWrangler(["whoami"], cwd)
  const output = `${result.stdout}\n${result.stderr}`

  if (result.status !== 0 || /not authenticated/i.test(output)) {
    throw new Error(
      "Wrangler no está autenticado. Ejecuta `npx wrangler login` y vuelve a intentarlo.",
    )
  }
}
