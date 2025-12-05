import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getVaults, createVault } from '../../services/api/endpoints'
import CreateVaultModal from '../../components/CreateVaultModal'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [vaults, setVaults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Load vaults from backend
  useEffect(() => {
    loadVaults()
  }, [])

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
      const newVault = await createVault(vaultData)
      // Reload vaults after creation
      await loadVaults()
      return newVault
    } catch (err) {
      throw new Error(err?.data?.error || err?.message || 'Fehler beim Erstellen')
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
              onClick={() => handleVaultClick(vault.id)}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 cursor-pointer transition-all hover:shadow-lg hover:scale-105 hover:border-indigo-500 dark:hover:border-indigo-400"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="bg-indigo-500 w-12 h-12 rounded-lg flex items-center justify-center text-2xl">
                  🔐
                </div>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-full">
                  {vault.entries_count || 0} Einträge
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {vault.name}
              </h3>
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
    </div>
  )
}
