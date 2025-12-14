/**
 * Vault Master Password Manager
 * Stores master passwords in memory for the current browser session.
 * Passwords are NOT stored in sessionStorage/localStorage to prevent XSS access and DevTools visibility.
 * This is Zero-Knowledge: passwords never leave the browser.
 */

// In-memory storage for master passwords
// This will be cleared on page reload, which is a desired security feature.
let memoryStorage = {}

const STORAGE_KEY = 'vault_master_passwords'

/**
 * Store master password for a vault
 * @param {string} vaultId - Vault ID
 * @param {string} masterPassword - Master password (only stored in memory)
 */
export function storeMasterPassword(vaultId, masterPassword) {
  try {
    memoryStorage[vaultId] = masterPassword
  } catch (err) {
    console.error('Failed to store master password:', err)
  }
}

/**
 * Get master password for a vault
 * @param {string} vaultId - Vault ID
 * @returns {string|null} Master password or null if not found
 */
export function getMasterPassword(vaultId) {
  try {
    return memoryStorage[vaultId] || null
  } catch (err) {
    console.error('Failed to get master password:', err)
    return null
  }
}

/**
 * Remove master password for a vault
 * @param {string} vaultId - Vault ID
 */
export function removeMasterPassword(vaultId) {
  try {
    delete memoryStorage[vaultId]
  } catch (err) {
    console.error('Failed to remove master password:', err)
  }
}

/**
 * Clear all master passwords (e.g., on logout)
 */
export function clearAllMasterPasswords() {
  try {
    memoryStorage = {}
    // Also clear from session storage just in case it was there from before
    sessionStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.error('Failed to clear master passwords:', err)
  }
}

