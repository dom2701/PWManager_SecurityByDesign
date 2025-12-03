import { LoginFormValues, RegisterFormValues, LoginResponse, RegisterResponse } from "../types/auth";

// Helpers: Web Crypto based PBKDF2 derivation and encoding helpers
const encoder = new TextEncoder()

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function genSalt(length = 16): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(length))
  return toBase64(salt)
}

async function deriveKeyBase64(password: string, saltB64: string, iterations = 100000, keyLen = 32): Promise<string> {
  const salt = fromBase64(saltB64)
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    keyLen * 8
  )

  return toBase64(new Uint8Array(derivedBits))
}

async function postJson(url: string, body: any) {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Request failed ${res.status}: ${text}`)
  }
  return res.json()
}

/**
 * Register flow (secure client-side derivation)
 * - generate salt
 * - derive key via PBKDF2
 * - send username/email and derivedKey + salt to backend
 */
async function handleRegisterSubmit(values: RegisterFormValues): Promise<RegisterResponse> {
  try {
    const { username, email, password } = values
    const salt = await genSalt(16)
    const derivedKey = await deriveKeyBase64(password, salt)

    const payload = { username, email, derivedKey, salt }
    const data = await postJson('/api/auth/register', payload)

    // Optionally store token (if backend returns one)
    if (data?.data?.token) {
      try { localStorage.setItem('authToken', data.data.token) } catch (e) { /* ignore */ }
    }

    return data as RegisterResponse
  } catch (err: any) {
    return { success: false, error: { code: 'network_error', message: err.message || 'Registration failed' } }
  }
}

/**
 * Login flow:
 * - request salt for username
 * - derive key with received salt
 * - send username + derivedKey to login endpoint
 */
async function handleLoginSubmit(values: LoginFormValues): Promise<LoginResponse> {
  try {
    const { username, password } = values

    // Request salt from server (server should return base64 salt)
    const saltRes = await fetch('/api/auth/salt', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })

    if (!saltRes.ok) {
      const text = await saltRes.text()
      throw new Error(`Failed to get salt: ${saltRes.status} ${text}`)
    }
    const saltJson = await saltRes.json()
    const salt = saltJson?.salt
    if (!salt) throw new Error('No salt returned from server')

    const derivedKey = await deriveKeyBase64(password, salt)

    const loginRes = await postJson('/api/auth/login', { username, derivedKey })
    if (loginRes?.data?.token) {
      try { localStorage.setItem('authToken', loginRes.data.token) } catch (e) { /* ignore */ }
    }
    return loginRes as LoginResponse
  } catch (err: any) {
    return { success: false, error: { code: 'network_error', message: err.message || 'Login failed' } }
  }
}

/**
 * Logout: call backend and clear client-side token/session
 */
async function handleLogout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
  } catch (e) {
    // ignore network errors on logout
  }
  try { localStorage.removeItem('authToken') } catch (e) { /* ignore */ }
  try { sessionStorage.removeItem('authToken') } catch (e) { /* ignore */ }
}

/**
 * Change password: client derives new key and sends it together with current auth (cookie/token)
 */
async function handlePasswortChange(newPassword: string): Promise<void> {
  const salt = await genSalt(16)
  const derivedKey = await deriveKeyBase64(newPassword, salt)
  await postJson('/api/auth/change-password', { derivedKey, salt })
}

export {
  handleLoginSubmit,
  handleRegisterSubmit,
  handleLogout,
  handlePasswortChange,
}
