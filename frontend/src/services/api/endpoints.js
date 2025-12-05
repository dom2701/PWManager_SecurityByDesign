/**
 * API Endpoints
 */

import * as api from './client'

// ========================
// Vault Endpoints
// ========================

/**
 * Get all vaults for user
 * @returns {Promise} Array of vaults
 */
export const getVaults = () => {
  return api.get('/vaults')
}

/**
 * Get single vault by ID
 * @param {string} vaultId - Vault ID
 * @returns {Promise} Vault data
 */
export const getVault = (vaultId) => {
  return api.get(`/vaults/${vaultId}`)
}

/**
 * Create new vault
 * @param {object} vaultData - Vault data
 * @returns {Promise} Created vault
 */
export const createVault = (vaultData) => {
  return api.post('/vaults', vaultData)
}

/**
 * Update vault
 * @param {string} vaultId - Vault ID
 * @param {object} vaultData - Updated vault data
 * @returns {Promise} Updated vault
 */
export const updateVault = (vaultId, vaultData) => {
  return api.put(`/vaults/${vaultId}`, vaultData)
}

/**
 * Delete vault
 * @param {string} vaultId - Vault ID
 * @returns {Promise} Delete response
 */
export const deleteVault = (vaultId) => {
  return api.del(`/vaults/${vaultId}`)
}

// ========================
// Vault Entry Endpoints
// ========================

/**
 * Get all entries in vault
 * @param {string} vaultId - Vault ID
 * @returns {Promise} Array of vault entries
 */
export const getVaultEntries = (vaultId) => {
  return api.get(`/vaults/${vaultId}/entries`)
}

/**
 * Create new vault entry
 * @param {string} vaultId - Vault ID
 * @param {object} entryData - Entry data
 * @returns {Promise} Created entry
 */
export const createVaultEntry = (vaultId, entryData) => {
  return api.post(`/vaults/${vaultId}/entries`, entryData)
}

/**
 * Update vault entry
 * @param {string} vaultId - Vault ID
 * @param {string} entryId - Entry ID
 * @param {object} entryData - Updated entry data
 * @returns {Promise} Updated entry
 */
export const updateVaultEntry = (vaultId, entryId, entryData) => {
  return api.put(`/vaults/${vaultId}/entries/${entryId}`, entryData)
}

/**
 * Delete vault entry
 * @param {string} vaultId - Vault ID
 * @param {string} entryId - Entry ID
 * @returns {Promise} Delete response
 */
export const deleteVaultEntry = (vaultId, entryId) => {
  return api.del(`/vaults/${vaultId}/entries/${entryId}`)
}

// ========================
// Audit Log Endpoints
// ========================

/**
 * Get audit logs
 * @param {object} options - Query options (page, limit, filter, etc.)
 * @returns {Promise} Audit logs
 */
export const getAuditLogs = (options = {}) => {
  const params = new URLSearchParams(options)
  return api.get(`/audit/logs?${params.toString()}`)
}

/**
 * Get audit log details
 * @param {string} logId - Audit log ID
 * @returns {Promise} Audit log details
 */
export const getAuditLogDetails = (logId) => {
  return api.get(`/audit/logs/${logId}`)
}

