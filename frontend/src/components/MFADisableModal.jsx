import React, { useState } from 'react'
import { useMFA } from '../hooks/useMFA'

export const MFADisableModal = ({ isOpen, onClose, onSuccess }) => {
  const { loading, error, removeMFA, clearError } = useMFA()
  const [localError, setLocalError] = useState(null)

  const handleDisableMFA = async () => {
    setLocalError(null)
    try {
      await removeMFA()
      handleClose()
      onSuccess?.()
    } catch (err) {
      const errorMsg = err?.data?.error || err?.message || 'MFA deaktivierung fehlgeschlagen'
      setLocalError(errorMsg)
      console.error('Failed to disable MFA:', err)
    }
  }

  const handleClose = () => {
    setLocalError(null)
    clearError()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          aria-label="Schließen"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          MFA deaktivieren?
        </h2>

        {(localError || error) && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
            {localError || error}
          </div>
        )}

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Sind Sie sicher, dass Sie die Zwei-Faktor-Authentifizierung deaktivieren möchten? Ihr Konto wird weniger sicher.
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleDisableMFA}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Wird deaktiviert...' : 'Deaktivieren'}
          </button>
        </div>
      </div>
    </div>
  )
}
