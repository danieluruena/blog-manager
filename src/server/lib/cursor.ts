export type ArticleCursor = {
  publishedAt: string;
  id: string;
};

export function encodeCursor(cursor: ArticleCursor): string {
  const bytes = new TextEncoder().encode(JSON.stringify(cursor));
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeCursor(value: string): ArticleCursor | null {
  try {
    const padding = value.length % 4;
    const base64 =
      value.replace(/-/g, "+").replace(/_/g, "/") + (padding ? "=".repeat(4 - padding) : "");
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const { publishedAt, id } = parsed as Partial<ArticleCursor>;

    if (typeof publishedAt !== "string" || typeof id !== "string") {
      return null;
    }

    return { publishedAt, id };
  } catch {
    return null;
  }
}
