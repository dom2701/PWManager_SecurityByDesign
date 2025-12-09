import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser } from '../../services/auth'
import { LoginFormValues, LoginFormProps, LoginResponse } from "../../types/auth";

export default function LoginForm(): React.ReactElement {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mfaRequired, setMfaRequired] = useState(false)
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // Backend-Login mit email und password
      const response = await (loginUser as any)(email, password, mfaCode || undefined)
      
      if (response && response.error === 'mfa_required') {
        // MFA ist erforderlich
        setMfaRequired(true)
        setError(null)
      } else if (response && (response.user || response.message === 'login successful')) {
        // Session-Cookie wird vom Backend automatisch gesetzt
        // Zu Dashboard navigieren
        navigate('/dashboard')
      } else {
        setError('Login erfolgreich, aber keine gültige Antwort erhalten')
      }
    } catch (err: any) {
      // Fehlerbehandlung
      if (err?.status === 403 && err?.data?.error === 'mfa_required') {
        setMfaRequired(true)
        setError(null)
      } else {
        const errorMessage = err?.data?.error || err?.message || 'Fehler beim Einloggen'
        setError(errorMessage)
      }
      console.error('Login error:', err)
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
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Passwort
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {mfaRequired && (
        <div>
          <label htmlFor="mfa" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            6-stelliger MFA-Code
          </label>
          <input
            id="mfa"
            name="mfa"
            type="text"
            inputMode="numeric"
            maxLength={6}
            required
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Gebe den Code aus deiner Authentifizierungs-App ein
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm">
          <a href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            Registrieren
          </a>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Anmelden…' : 'Anmelden'}
        </button>
      </div>
    </form>
  )
}




