import { randomHex, toHex } from "./encoding";

const SESSION_TOKEN_BYTES = 32;

export function generateSessionToken(): string {
  return randomHex(SESSION_TOKEN_BYTES);
}

export async function hashSessionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return toHex(new Uint8Array(digest));
}
