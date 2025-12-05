import React, { useState, useEffect } from 'react'

/**
 * Modal to create or edit a vault entry
 */
export default function VaultEntryModal({ isOpen, onClose, onSubmit, entry = null, mode = 'create' }) {
  const [formData, setFormData] = useState({
    title: '',
    username: '',
    password: '',
    url: '',
    notes: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load entry data when editing
  useEffect(() => {
    if (entry && mode === 'edit') {
      setFormData({
        title: entry.title || '',
        username: entry.username || '',
        password: entry.password || '',
        url: entry.url || '',
        notes: entry.notes || ''
      })
    } else {
      setFormData({
        title: '',
        username: '',
        password: '',
        url: '',
        notes: ''
      })
    }
  }, [entry, mode, isOpen])

  if (!isOpen) return null

  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  function generatePassword() {
    const length = 16
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
    let password = ''
    const randomValues = new Uint8Array(length)
    window.crypto.getRandomValues(randomValues)
    
    for (let i = 0; i < length; i++) {
      password += charset[randomValues[i] % charset.length]
    }
    
    setFormData(prev => ({ ...prev, password }))
    setShowPassword(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    // Validate
    if (!formData.title.trim()) {
      setError('Titel darf nicht leer sein')
      return
    }

    if (!formData.password) {
      setError('Passwort darf nicht leer sein')
      return
    }

    setLoading(true)
    try {
      await onSubmit(formData)
      handleClose()
    } catch (err) {
      console.error('Error submitting entry:', err)
      setError(err?.message || err?.data?.error || 'Fehler beim Speichern')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setFormData({
      title: '',
      username: '',
      password: '',
      url: '',
      notes: ''
    })
    setError(null)
    setLoading(false)
    setShowPassword(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {mode === 'edit' ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}
          </h2>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 max-h-96 overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded text-sm">
                {error}
              </div>
            )}

            {/* Title */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Titel *
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="z.B. Gmail, Netflix, Amazon..."
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              />
            </div>

            {/* Username */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Benutzername / E-Mail
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="z.B. max@example.com"
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Passwort *
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Passwort eingeben"
                    className="w-full px-4 py-2 pr-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-2 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
                  disabled={loading}
                >
                  🎲 Generieren
                </button>
              </div>
            </div>

            {/* URL */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Website-URL
              </label>
              <input
                type="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                placeholder="https://example.com"
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              />
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Notizen
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Zusätzliche Informationen..."
                rows="3"
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              />
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
              {loading ? 'Wird gespeichert...' : (mode === 'edit' ? 'Aktualisieren' : 'Erstellen')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
