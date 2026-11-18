import { constantTimeEqual, fromHex, randomHex, toHex } from "./encoding"

const ALGORITHM = "hmac-sha256"
const VERSION = "1"
const SALT_BYTES = 16
const MIN_PEPPER_LENGTH = 32

async function hmac(
  pepper: string,
  salt: Uint8Array<ArrayBuffer>,
  password: string,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const passwordBytes = new TextEncoder().encode(password)
  const data = new Uint8Array(salt.length + passwordBytes.length)

  data.set(salt)
  data.set(passwordBytes, salt.length)

  const signature = await crypto.subtle.sign("HMAC", key, data)

  return new Uint8Array(signature)
}

export async function hashPassword(password: string, pepper: string): Promise<string> {
  if (pepper.length < MIN_PEPPER_LENGTH) {
    throw new Error(`AUTH_PEPPER debe tener al menos ${MIN_PEPPER_LENGTH} caracteres`)
  }

  const salt = fromHex(randomHex(SALT_BYTES))
  const hash = await hmac(pepper, salt, password)

  return `${ALGORITHM}$${VERSION}$${toHex(salt)}$${toHex(hash)}`
}

export async function verifyPassword(
  password: string,
  storedHash: string,
  pepper: string,
): Promise<boolean> {
  if (pepper.length < MIN_PEPPER_LENGTH) {
    return false
  }

  const parts = storedHash.split("$")

  if (parts.length !== 4 || parts[0] !== ALGORITHM || parts[1] !== VERSION) {
    return false
  }

  let salt: Uint8Array<ArrayBuffer>
  let expected: Uint8Array

  try {
    salt = fromHex(parts[2])
    expected = fromHex(parts[3])
  } catch {
    return false
  }

  const actual = await hmac(pepper, salt, password)

  return constantTimeEqual(actual, expected)
}
