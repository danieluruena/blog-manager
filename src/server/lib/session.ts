import { randomHex, sha256Hex } from "./encoding"

const SESSION_TOKEN_BYTES = 32

export function generateSessionToken(): string {
  return randomHex(SESSION_TOKEN_BYTES)
}

export async function hashSessionToken(token: string): Promise<string> {
  return sha256Hex(token)
}
