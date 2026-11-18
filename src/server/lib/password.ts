import { constantTimeEqual, fromHex, randomHex, toHex } from "./encoding"

const ALGORITHM = "pbkdf2"
const ITERATIONS = 600_000
const SALT_BYTES = 16
const HASH_BYTES = 32
const MIN_ITERATIONS = 100_000
const MAX_ITERATIONS = 1_000_000

async function derivePassword(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    keyMaterial,
    HASH_BYTES * 8,
  )

  return new Uint8Array(bits)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = fromHex(randomHex(SALT_BYTES))
  const hash = await derivePassword(password, salt, ITERATIONS)

  return `${ALGORITHM}$${ITERATIONS}$${toHex(salt)}$${toHex(hash)}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split("$")

  if (parts.length !== 4 || parts[0] !== ALGORITHM) {
    return false
  }

  const iterations = Number.parseInt(parts[1], 10)

  if (!Number.isInteger(iterations) || iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) {
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

  const actual = await derivePassword(password, salt, iterations)

  return constantTimeEqual(actual, expected)
}
