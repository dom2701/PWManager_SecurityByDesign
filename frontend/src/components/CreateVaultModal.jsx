import React, { useState } from 'react'

/**
 * Modal to create a new vault
 */
export default function CreateVaultModal({ isOpen, onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    // Validate
    if (!name || name.trim().length < 1) {
      setError('Vault-Name darf nicht leer sein')
      return
    }

    if (name.length > 255) {
      setError('Vault-Name darf maximal 255 Zeichen lang sein')
      return
    }

    setLoading(true)
    try {
      // Generate encryption salt (32 bytes hex-encoded = 64 hex chars)
      const saltBytes = window.crypto.getRandomValues(new Uint8Array(32))
      const encryptionSalt = Array.from(saltBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      await onSubmit({
        name: name.trim(),
        encryption_salt: encryptionSalt,
      })

      // Success - close modal
      handleClose()
    } catch (err) {
      setError(err?.message || 'Fehler beim Erstellen des Vaults')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setName('')
    setError(null)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Neuen Vault erstellen
          </h2>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4">
            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="vault-name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Vault-Name
              </label>
              <input
                id="vault-name"
                type="text"
                required
                minLength={1}
                maxLength={255}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Persönlich, Arbeit, Banking..."
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Der Name sollte beschreiben, welche Art von Passwörtern du hier speicherst
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors disabled:opacity-60"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-60"
            >
              {loading ? 'Wird erstellt...' : 'Vault erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
