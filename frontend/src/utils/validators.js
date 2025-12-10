/**
 * Validation utilities
 */

/**
 * Check if a string is a valid URL
 * @param {string} string - String to check
 * @returns {boolean} True if valid URL
 */
export function isValidUrl(string) {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

/**
 * Check if a vault name is valid
 * @param {string} name - Vault name
 * @returns {boolean} True if valid
 */
export function isValidVaultName(name) {
  return name && name.trim().length > 0 && name.length <= 255
}

/**
 * Check if a password meets requirements
 * @param {string} password - Password
 * @returns {boolean} True if valid
 */
export function isValidPassword(password) {
  return password && password.length >= 12
}
