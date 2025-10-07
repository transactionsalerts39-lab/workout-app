const HEX_DIGITS = Array.from({ length: 256 }, (_, index) => index.toString(16).padStart(2, '0'))

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let hex = ''
  for (let i = 0; i < bytes.length; i += 1) {
    hex += HEX_DIGITS[bytes[i]]
  }
  return hex
}

function getCrypto(): Crypto | undefined {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto as Crypto
  }
  return undefined
}

export function createSalt(length = 16): string {
  const cryptoRef = getCrypto()
  if (cryptoRef?.getRandomValues) {
    const bytes = new Uint8Array(length)
    cryptoRef.getRandomValues(bytes)
    return bufferToHex(bytes.buffer).slice(0, length * 2)
  }

  let salt = ''
  for (let i = 0; i < length; i += 1) {
    salt += Math.floor(Math.random() * 16).toString(16)
  }
  return salt
}

async function digestSha256(input: Uint8Array): Promise<string | null> {
  const cryptoRef = getCrypto()
  if (cryptoRef?.subtle) {
    const arrayBuffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength)
    const digest = await cryptoRef.subtle.digest('SHA-256', arrayBuffer as unknown as BufferSource)
    return bufferToHex(digest)
  }
  return null
}

function fallbackHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return hash.toString(16)
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const text = `${salt}:${password}`
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const digest = await digestSha256(data)
  if (digest) {
    return digest
  }
  if (typeof btoa === 'function') {
    return btoa(text)
  }
  return fallbackHash(text)
}

export async function verifyPassword(candidate: string, salt: string, expectedHash: string): Promise<boolean> {
  const candidateHash = await hashPassword(candidate, salt)
  return candidateHash === expectedHash
}
