/**
 * Crypto utilities for client-side encryption/decryption
 * Uses AES-GCM with vault's encryption salt
 */

/**
 * Derive encryption key from master password and vault salt
 * @param {string} masterPassword - User's master password
 * @param {string} saltHex - Vault encryption salt (hex string)
 * @returns {Promise<CryptoKey>} Derived encryption key
 */
export async function deriveKey(masterPassword, saltHex) {
  const encoder = new TextEncoder()
  const saltBytes = hexToBytes(saltHex)
  
  // Import password as key material
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  
  // Derive AES-GCM key using PBKDF2
  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 600000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt data using AES-GCM
 * @param {object} data - Plain data object to encrypt
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<{encrypted: string, nonce: string}>} Hex-encoded encrypted data and nonce
 */
export async function encryptData(data, key) {
  const encoder = new TextEncoder()
  const plaintext = encoder.encode(JSON.stringify(data))
  
  // Generate random 12-byte nonce
  const nonce = window.crypto.getRandomValues(new Uint8Array(12))
  
  // Encrypt
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    plaintext
  )
  
  return {
    encrypted_data: bytesToHex(new Uint8Array(ciphertext)),
    nonce: bytesToHex(nonce)
  }
}

/**
 * Decrypt data using AES-GCM
 * @param {string} encryptedHex - Hex-encoded encrypted data
 * @param {string} nonceHex - Hex-encoded nonce (12 bytes)
 * @param {CryptoKey} key - Decryption key
 * @returns {Promise<object>} Decrypted data object
 */
export async function decryptData(encryptedHex, nonceHex, key) {
  const decoder = new TextDecoder()
  const ciphertext = hexToBytes(encryptedHex)
  const nonce = hexToBytes(nonceHex)
  
  try {
    const plaintext = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: nonce },
      key,
      ciphertext
    )
    
    const jsonString = decoder.decode(plaintext)
    return JSON.parse(jsonString)
  } catch {
    throw new Error('Entschlüsselung fehlgeschlagen. Falsches Master-Passwort?')
  }
}

/**
 * Convert hex string to byte array
 */
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

/**
 * Convert byte array to hex string
 */
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
