/**
 * Vault Master Password Manager
 * Stores master passwords in session storage for the current browser session
 * This is Zero-Knowledge: passwords never leave the browser
 */

const STORAGE_KEY = 'vault_master_passwords'

/**
 * Store master password for a vault
 * @param {string} vaultId - Vault ID
 * @param {string} masterPassword - Master password (only stored in session)
 */
export function storeMasterPassword(vaultId, masterPassword) {
  try {
    const passwords = getMasterPasswords()
    passwords[vaultId] = masterPassword
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(passwords))
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
    const passwords = getMasterPasswords()
    return passwords[vaultId] || null
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
    const passwords = getMasterPasswords()
    delete passwords[vaultId]
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(passwords))
  } catch (err) {
    console.error('Failed to remove master password:', err)
  }
}

/**
 * Clear all master passwords (e.g., on logout)
 */
export function clearAllMasterPasswords() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.error('Failed to clear master passwords:', err)
  }
}

/**
 * Get all stored master passwords
 * @returns {object} Object with vaultId as key and password as value
 */
function getMasterPasswords() {
  try {
    const data = sessionStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : {}
  } catch (err) {
    console.error('Failed to parse master passwords:', err)
    return {}
  }
}
