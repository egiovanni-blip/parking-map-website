// HMAC-SHA256 cookie signing using Web Crypto (runs in both Edge and Node.js runtimes)

function toUrlSafeBase64(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function fromUrlSafeBase64(str) {
  let s = str.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return atob(s)
}

async function getKey(secret) {
  const enc = new TextEncoder()
  return globalThis.crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
}

async function computeHmac(key, data) {
  const enc = new TextEncoder()
  const buf = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(data))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function signTenantCookie(payload) {
  const secret = process.env.TENANT_SESSION_SECRET
  if (!secret) throw new Error('TENANT_SESSION_SECRET env var is not set')

  const encoded = toUrlSafeBase64(JSON.stringify(payload))
  const key = await getKey(secret)
  const sig = await computeHmac(key, encoded)
  return encoded + '.' + sig
}

export async function verifyTenantCookie(cookieValue) {
  if (!cookieValue) return null
  const secret = process.env.TENANT_SESSION_SECRET
  if (!secret) return null

  const dot = cookieValue.lastIndexOf('.')
  if (dot === -1) return null

  const encoded = cookieValue.slice(0, dot)
  const sig = cookieValue.slice(dot + 1)

  const key = await getKey(secret)
  const expected = await computeHmac(key, encoded)

  // Constant-time comparison to prevent timing attacks
  if (expected.length !== sig.length) return null
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
  if (diff !== 0) return null

  try {
    return JSON.parse(fromUrlSafeBase64(encoded))
  } catch {
    return null
  }
}
