import React, { useState } from 'react'

/**
 * Modal to create a new vault with master password
 */
export default function CreateVaultModal({ isOpen, onClose, onSubmit, existingVaults = [] }) {
  const [name, setName] = useState('')
  const [masterPassword, setMasterPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    // Validate name
    if (!name || name.trim().length < 1) {
      setError('Vault-Name darf nicht leer sein')
      return
    }

    if (name.length > 255) {
      setError('Vault-Name darf maximal 255 Zeichen lang sein')
      return
    }

    // Check for duplicate name
    if (existingVaults.some(v => v.name.toLowerCase() === name.trim().toLowerCase())) {
      setError('Ein Vault mit diesem Namen existiert bereits')
      return
    }

    // Validate master password
    if (!masterPassword) {
      setError('Master-Passwort darf nicht leer sein')
      return
    }

    if (masterPassword.length < 12) {
      setError('Master-Passwort muss mindestens 12 Zeichen lang sein')
      return
    }

    if (masterPassword !== confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      return
    }

    setLoading(true)
    try {
      // Dynamic import for crypto functions
      const { deriveKey, encryptData } = await import('../utils/crypto')

      // Generate encryption salt (32 bytes hex-encoded = 64 hex chars)
      const saltBytes = window.crypto.getRandomValues(new Uint8Array(32))
      const encryptionSalt = Array.from(saltBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      // Create validation hash: encrypt a test value with the derived key
      // This allows password verification even for empty vaults
      const key = await deriveKey(masterPassword, encryptionSalt)
      const encryptionResult = await encryptData({ validation: 'test' }, key)

      await onSubmit({
        name: name.trim(),
        encryption_salt: encryptionSalt,
        master_password: masterPassword, // Pass master password to parent
        validation_hash: encryptionResult.encrypted_data,
        validation_nonce: encryptionResult.nonce
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
    setMasterPassword('')
    setConfirmPassword('')
    setShowPassword(false)
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
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            🔒 Zero-Knowledge: Dein Master-Passwort verlässt niemals deinen Browser
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded text-sm">
                {error}
              </div>
            )}

            {/* Vault Name */}
            <div>
              <label htmlFor="vault-name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Vault-Name *
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
            </div>

            {/* Master Password */}
            <div>
              <label htmlFor="master-password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Master-Passwort *
              </label>
              <div className="relative">
                <input
                  id="master-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={12}
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="Mindestens 12 Zeichen"
                  className="w-full px-4 py-2 pr-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-2 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                ⚠️ Wird benötigt um Einträge zu ver-/entschlüsseln. Kann nicht wiederhergestellt werden!
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Master-Passwort bestätigen *
              </label>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Passwort wiederholen"
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                <strong>Wichtig:</strong> Das Master-Passwort wird nur in deinem Browser verwendet und niemals an den Server gesendet. 
                Es wird zur Ableitung des Verschlüsselungs-Keys mittels PBKDF2 genutzt. 
                Bei Verlust können deine Einträge nicht wiederhergestellt werden.
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
