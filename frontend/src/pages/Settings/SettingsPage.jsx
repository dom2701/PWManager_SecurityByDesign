import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // User profile data (static)
  const [profile] = useState({
    username: 'max.mustermann',
    email: 'max@gmail.com',
    createdAt: '2024-01-15',
    lastLogin: '2024-12-03 14:30'
  })

  const handlePasswordChangeRequest = (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validierung
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Bitte alle Felder ausfüllen')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Die neuen Passwörter stimmen nicht überein')
      return
    }

    if (newPassword.length < 8) {
      setError('Das neue Passwort muss mindestens 8 Zeichen lang sein')
      return
    }

    // Zeige Bestätigungs-Modal
    setShowConfirmModal(true)
    setConfirmText('')
  }

  const handleConfirmPasswordChange = async () => {
    if (confirmText !== 'bestätigen') {
      setError('Bitte "bestätigen" eingeben')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Hier würde normalerweise der API-Call erfolgen
      // await handlePasswortChange(newPassword)
      
      // Simuliere API-Call
      await new Promise(resolve => setTimeout(resolve, 1000))

      setSuccess('Master-Passwort erfolgreich geändert!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowConfirmModal(false)
      setConfirmText('')
    } catch (err) {
      setError('Fehler beim Ändern des Passworts: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setShowConfirmModal(false)
    setConfirmText('')
    setError('')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 px-4 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 rounded-lg font-medium transition-colors mb-4"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Zurück zum Dashboard
        </button>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Profil bearbeiten
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Verwalte deine Kontoinformationen und Sicherheitseinstellungen
        </p>
      </div>

      {/* Profile Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Profilinformationen
        </h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
              <img 
                src="https://png.pngtree.com/png-clipart/20210915/ourmid/pngtree-avatar-icon-abstract-user-login-icon-png-image_3917181.jpg" 
                alt="Profile" 
                className="w-20 h-20 rounded-full object-cover"
              />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">{profile.username}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{profile.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Benutzername
              </label>
              <input
                type="text"
                value={profile.username}
                readOnly
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                E-Mail
              </label>
              <input
                type="email"
                value={profile.email}
                readOnly
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Erstellt am
              </label>
              <input
                type="text"
                value={profile.createdAt}
                readOnly
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Letzter Login
              </label>
              <input
                type="text"
                value={profile.lastLogin}
                readOnly
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Master-Passwort ändern
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          ⚠️ Das Ändern des Master-Passworts ist eine sicherheitskritische Aktion und erfordert eine Bestätigung.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-600 dark:text-green-400">
            {success}
          </div>
        )}

        <form onSubmit={handlePasswordChangeRequest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Aktuelles Master-Passwort
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Aktuelles Passwort eingeben"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Neues Master-Passwort
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Neues Passwort (mind. 8 Zeichen)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Neues Master-Passwort bestätigen
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Neues Passwort wiederholen"
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            Master-Passwort ändern
          </button>
        </form>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl">⚠️</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Passwortänderung bestätigen
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Du bist dabei, dein Master-Passwort zu ändern. Diese Aktion kann nicht rückgängig gemacht werden.
            </p>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-400">
                Bitte gib <strong>"bestätigen"</strong> ein, um fortzufahren:
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Schreibe "bestätigen"'
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleConfirmPasswordChange}
                disabled={loading || confirmText !== 'bestätigen'}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {loading ? 'Wird geändert...' : 'Bestätigen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
