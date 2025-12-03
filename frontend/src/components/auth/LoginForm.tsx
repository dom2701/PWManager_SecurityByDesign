import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { handleLoginSubmit } from '../../handlers/authHandlers'
import { LoginFormValues, LoginFormProps, LoginResponse } from "../../types/auth";

export default function LoginForm(): React.ReactElement {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // Hardkodierte Test-Login-Daten
      const validUsername = 'admin'
      const validPassword = 'password123'
      
      if (username === validUsername && password === validPassword) {
        const dummyToken = 'dummy_token_' + Date.now()
        localStorage.setItem('authToken', dummyToken)
        navigate('/dashboard')
      } else {
        setError('Ungültige Anmeldedaten. Verwende: admin / password123')
      }
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Einloggen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
      
      <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
        Test-Login: <span className="font-mono">admin</span> / <span className="font-mono">password123</span>
      </div>

      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Nutzername oder E-Mail
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
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




