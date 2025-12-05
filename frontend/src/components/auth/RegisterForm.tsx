import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerUser } from '../../services/auth'
import { startSession } from '../../hooks/useSession'

export default function RegisterForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    
    // Validierungen
    if (password !== confirm) {
      setError('Passwörter stimmen nicht überein')
      return
    }

    if (password.length < 12) {
      setError('Passwort muss mindestens 12 Zeichen lang sein')
      return
    }

    if (password.length > 128) {
      setError('Passwort darf maximal 128 Zeichen lang sein')
      return
    }

    setLoading(true)
    try {
      const response = await registerUser(email, password)
      
      if (response && (response.user || response.message === 'user registered successfully')) {
        // Session-Cookie wird vom Backend automatisch gesetzt
        // Zu Dashboard navigieren
        navigate('/dashboard')
      } else {
        setError('Registrierung erfolgreich, aber keine gültige Antwort erhalten')
      }
    } catch (err: any) {
      // Fehlerbehandlung
      const errorMessage = err?.data?.error || err?.message || 'Registrierungsfehler'
      setError(errorMessage)
      console.error('Registration error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          E-Mail
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Passwort (12-128 Zeichen)
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={12}
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Passwort bestätigen
        </label>
        <input
          id="confirm"
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm">
          <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
            Bereits registriert? Anmelden
          </a>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Wird registriert...' : 'Registrieren'}
        </button>
      </div>
    </form>
  )
}