import { describe, expect, it } from "vitest";

import { findAvailableSlug, slugCandidate, toSlug } from "../../src/server/lib/slug";

describe("toSlug", () => {
  it("normaliza acentos, mayúsculas y puntuación", () => {
    expect(toSlug("¡Hola, mundo!")).toBe("hola-mundo");
    expect(toSlug("Año Nuevo en Bogotá")).toBe("ano-nuevo-en-bogota");
    expect(toSlug("  Muchos   espacios  ")).toBe("muchos-espacios");
  });

  it("recorta a la longitud máxima y evita guiones finales", () => {
    const slug = toSlug("una frase bastante larga para el slug", 12);

    expect(slug).toBe("una-frase");
    expect(slug.endsWith("-")).toBe(false);
  });

  it("devuelve un slug de respaldo si no queda texto", () => {
    expect(toSlug("!!!")).toBe("sin-titulo");
  });
});

describe("slugCandidate", () => {
  it("añade un sufijo numérico a partir del segundo intento", () => {
    expect(slugCandidate("mi-articulo", 0)).toBe("mi-articulo");
    expect(slugCandidate("mi-articulo", 1)).toBe("mi-articulo-2");
    expect(slugCandidate("mi-articulo", 2)).toBe("mi-articulo-3");
  });
});

describe("findAvailableSlug", () => {
  it("encuentra el primer slug libre", async () => {
    const taken = new Set(["mi-articulo", "mi-articulo-2"]);

    await expect(findAvailableSlug("mi-articulo", async (slug) => taken.has(slug))).resolves.toBe(
      "mi-articulo-3",
    );
  });

  it("falla si no encuentra un slug libre", async () => {
    await expect(findAvailableSlug("mi-articulo", async () => true, 3)).rejects.toThrow(
      "No se pudo generar un slug único",
    );
  });
});
