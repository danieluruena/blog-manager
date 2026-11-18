import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

type HealthBody = {
  ok: boolean;
  service: string;
  version: string;
  timestamp: string;
};

type ErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

describe("GET /api/health", () => {
  it("responde 200 con el estado del servicio", async () => {
    const response = await exports.default.fetch("http://example.com/api/health");

    expect(response.status).toBe(200);

    const body = (await response.json()) as HealthBody;

    expect(body.ok).toBe(true);
    expect(body.service).toBe("blog-manager");
    expect(body.version).toBe("0.1.0");
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

  it("devuelve un 404 JSON para rutas de API desconocidas", async () => {
    const response = await exports.default.fetch("http://example.com/api/no-existe");

    expect(response.status).toBe(404);

    const body = (await response.json()) as ErrorBody;

    expect(body.error.code).toBe("NOT_FOUND");
  });
});
