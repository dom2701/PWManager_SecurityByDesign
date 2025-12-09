import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getVaults, createVault, deleteVault, updateVault } from '../../services/api/endpoints'
import { getCurrentUser } from '../../services/auth'
import CreateVaultModal from '../../components/CreateVaultModal'
import { storeMasterPassword } from '../../utils/masterPassword'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [vaults, setVaults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [renameVaultId, setRenameVaultId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)

  // Load vaults and current user from backend
  useEffect(() => {
    loadVaults()
    loadCurrentUser()
  }, [])

  async function loadCurrentUser() {
    try {
      const userData = await getCurrentUser()
      setCurrentUser(userData)
    } catch (err) {
      console.error('Failed to load current user:', err)
      // Don't show error if we can't load user, just continue
    }
  }

  async function loadVaults() {
    setLoading(true)
    setError(null)
    try {
      const data = await getVaults()
      // Backend returns array directly, not wrapped in object
      setVaults(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load vaults:', err)
      setError('Fehler beim Laden der Vaults')
      setVaults([])
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateVault(vaultData) {
    try {
      // Extract master password and validation data before sending to backend
      const { master_password, validation_hash, validation_nonce, ...backendData } = vaultData
      
      // Create vault on backend (without master password, but with validation hash)
      const newVault = await createVault(backendData)
      
      // Store master password locally (Zero-Knowledge)
      if (master_password && newVault.id) {
        storeMasterPassword(newVault.id, master_password)
      }
      
      // Store validation hash in localStorage (client-side validation)
      if (validation_hash && validation_nonce && newVault.id) {
        localStorage.setItem(`vault_validation_${newVault.id}`, JSON.stringify({
          hash: validation_hash,
          nonce: validation_nonce
        }))
      }
      
      // Reload vaults after creation
      await loadVaults()
      return newVault
    } catch (err) {
      throw new Error(err?.data?.error || err?.message || 'Fehler beim Erstellen')
    }
  }

  async function handleDeleteVault(vaultId, vaultName) {
    if (!confirm(`Vault "${vaultName}" wirklich löschen? Alle Einträge werden ebenfalls gelöscht!`)) {
      return
    }

    try {
      await deleteVault(vaultId)
      // Reload vaults after deletion
      await loadVaults()
    } catch (err) {
      console.error('Failed to delete vault:', err)
      setError(err?.data?.error || err?.message || 'Fehler beim Löschen des Vaults')
    }
  }

  function openRenameModal(vaultId, currentName) {
    setRenameVaultId(vaultId)
    setRenameValue(currentName)
    setRenameError('')
  }

  function closeRenameModal() {
    setRenameVaultId(null)
    setRenameValue('')
    setRenameError('')
  }

  async function handleRenameSubmit(e) {
    e.preventDefault()
    
    if (!renameValue.trim()) {
      setRenameError('Vault-Name darf nicht leer sein')
      return
    }

    if (renameValue.trim().length > 255) {
      setRenameError('Vault-Name darf maximal 255 Zeichen lang sein')
      return
    }

    setRenameLoading(true)
    setRenameError('')

    try {
      await updateVault(renameVaultId, { name: renameValue.trim() })
      await loadVaults()
      closeRenameModal()
    } catch (err) {
      console.error('Failed to rename vault:', err)
      setRenameError(err?.data?.error || err?.message || 'Fehler beim Umbenennen des Vaults')
    } finally {
      setRenameLoading(false)
    }
  }

  const filteredVaults = vaults.filter(vault =>
    vault.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleVaultClick = (vaultId) => {
    navigate(`/vault/${vaultId}`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="mb-2">
              <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                👋 Willkommen zurück, {currentUser?.email?.split('@')[0] || 'Benutzer'}!
              </p>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Meine Vaults
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Verwalte deine Passwörter sicher und organisiert
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Neuer Vault
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Vault suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pl-12 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <svg
            className="absolute left-4 top-3.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Gesamt Vaults</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{vaults.length}</p>
            </div>
            <div className="text-4xl">📁</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Gesamt Passwörter</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {vaults.reduce((sum, v) => sum + (v.entries_count || 0), 0)}
              </p>
            </div>
            <div className="text-4xl">🔑</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Zuletzt bearbeitet</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">Heute</p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-6">
          {error}
        </div>
      )}

      {/* Vaults Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVaults.map((vault) => (
            <div
              key={vault.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-lg hover:border-indigo-500 dark:hover:border-indigo-400 relative group"
            >
              {/* Action Buttons */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openRenameModal(vault.id, vault.name)
                  }}
                  className="p-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg"
                  title="Vault umbenennen"
                >
                  <svg
                    className="h-5 w-5 text-indigo-600 dark:text-indigo-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteVault(vault.id, vault.name)
                  }}
                  className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                  title="Vault löschen"
                >
                  <svg
                    className="h-5 w-5 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>

              {/* Vault Content - clickable */}
              <div
                onClick={() => handleVaultClick(vault.id)}
                className="cursor-pointer"
              >
                <div className="flex items-start mb-4">
                  <div className="bg-indigo-500 w-12 h-12 rounded-lg flex items-center justify-center text-2xl">
                    🔐
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {vault.name}
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-500">
                    <svg
                      className="h-4 w-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {vault.updated_at ? new Date(vault.updated_at).toLocaleDateString('de-DE') : 'Neu'}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {vault.entries_count || 0}
                    </span>
                    <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-full">
                      {vault.entries_count === 1 ? 'Eintrag' : 'Einträge'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredVaults.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? 'Keine Vaults gefunden' : 'Noch keine Vaults vorhanden. Erstelle deinen ersten Vault!'}
          </p>
        </div>
      )}

      {/* Create Vault Modal */}
      <CreateVaultModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateVault}
      />

      {/* Rename Vault Modal */}
      {renameVaultId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Vault umbenennen
              </h2>
            </div>

            <form onSubmit={handleRenameSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Neuer Name
                </label>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => {
                    setRenameValue(e.target.value)
                    setRenameError('')
                  }}
                  placeholder="Vault-Name eingeben..."
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={renameLoading}
                  autoFocus
                />
              </div>

              {renameError && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg text-sm">
                  {renameError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeRenameModal}
                  disabled={renameLoading}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={renameLoading}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {renameLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Wird gespeichert...
                    </>
                  ) : (
                    'Speichern'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
