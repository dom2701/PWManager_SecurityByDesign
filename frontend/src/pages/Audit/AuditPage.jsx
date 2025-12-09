import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuditLogs } from '../../services/api/endpoints'

// Action icon mapping
const actionIcons = {
  'user.registered': '📝',
  'user.login': '✅',
  'user.logout': '👋',
  'user.login_failed': '❌',
  'mfa.setup': '🔐',
  'mfa.enabled': '🛡️',
  'mfa.disabled': '🔓',
  'mfa.verified': '✔️',
  'mfa.failed': '❌',
  'vault.created': '🆕',
  'vault.updated': '✏️',
  'vault.deleted': '🗑️',
  'vault.accessed': '👁️',
  'entry.created': '🆕',
  'entry.updated': '✏️',
  'entry.deleted': '🗑️',
  'entry.accessed': '👁️',
}

// Action label mapping (German)
const actionLabels = {
  'user.registered': 'Benutzer registriert',
  'user.login': 'Anmeldung erfolgreich',
  'user.logout': 'Abgemeldet',
  'user.login_failed': 'Anmeldung fehlgeschlagen',
  'mfa.setup': 'Zwei-Faktor-Auth eingerichtet',
  'mfa.enabled': 'Zwei-Faktor-Auth aktiviert',
  'mfa.disabled': 'Zwei-Faktor-Auth deaktiviert',
  'mfa.verified': 'Zwei-Faktor-Auth verifiziert',
  'mfa.failed': 'Zwei-Faktor-Auth fehlgeschlagen',
  'vault.created': 'Vault erstellt',
  'vault.updated': 'Vault aktualisiert',
  'vault.deleted': 'Vault gelöscht',
  'vault.accessed': 'Vault zugegriffen',
  'entry.created': 'Eintrag erstellt',
  'entry.updated': 'Eintrag aktualisiert',
  'entry.deleted': 'Eintrag gelöscht',
  'entry.accessed': 'Eintrag zugegriffen',
}

// Action category mapping
const actionCategories = {
  'user.registered': 'Authentifizierung',
  'user.login': 'Authentifizierung',
  'user.logout': 'Authentifizierung',
  'user.login_failed': 'Authentifizierung',
  'mfa.setup': 'Sicherheit',
  'mfa.enabled': 'Sicherheit',
  'mfa.disabled': 'Sicherheit',
  'mfa.verified': 'Sicherheit',
  'mfa.failed': 'Sicherheit',
  'vault.created': 'Vault',
  'vault.updated': 'Vault',
  'vault.deleted': 'Vault',
  'vault.accessed': 'Vault',
  'entry.created': 'Eintrag',
  'entry.updated': 'Eintrag',
  'entry.deleted': 'Eintrag',
  'entry.accessed': 'Eintrag',
}

export default function AuditPage() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadAuditLogs()
  }, [])

  async function loadAuditLogs() {
    setLoading(true)
    setError(null)
    try {
      const data = await getAuditLogs()
      console.log('Audit logs loaded:', data)
      
      // Handle different response formats
      let auditLogs = []
      if (Array.isArray(data)) {
        auditLogs = data
      } else if (data && data.logs && Array.isArray(data.logs)) {
        auditLogs = data.logs
      } else if (data && data.data && Array.isArray(data.data)) {
        auditLogs = data.data
      }
      
      setLogs(auditLogs)
    } catch (err) {
      console.error('Failed to load audit logs:', err)
      // Show error but don't prevent UI from rendering
      setError('Audit-Logs konnten nicht geladen werden. Die Seite wird möglicherweise später aktualisiert.')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const categoryMatch = filter === 'all' || actionCategories[log.action] === filter
    const searchMatch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.ip_address && log.ip_address.includes(searchTerm))
    return categoryMatch && searchMatch
  })

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  // Mask IP address for privacy
  const maskIP = (ip) => {
    if (!ip) return 'Unbekannt'
    const parts = ip.split('.')
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.***`
    }
    return ip
  }

  // Extract details from log
  const getDetailsLabel = (log) => {
    try {
      if (log.details) {
        const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details
        if (details.vault_name) return `${details.vault_name}`
        if (details.entry_title) return `${details.entry_title}`
      }
    } catch (e) {
      // Ignore parse errors
    }
    return ''
  }

  // Get severity badge color
  const getSeverityColor = (action) => {
    const severity = actionSeverity[action] || 'info'
    const colors = {
      info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      low: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
      warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
      high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    }
    return colors[severity] || colors.info
  }

  const categories = ['all', 'Authentifizierung', 'Sicherheit', 'Vault', 'Eintrag']

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          🔍 Audit-Protokoll
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Alle wichtigen Aktionen und Sicherheitsereignisse in deinem Konto
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Gesamt Einträge</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{logs.length}</p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Heute</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length}
              </p>
            </div>
            <div className="text-3xl">📅</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Warnungen</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {logs.filter(l => ['user.login_failed', 'mfa.failed', 'vault.deleted', 'entry.deleted'].includes(l.action)).length}
              </p>
            </div>
            <div className="text-3xl">⚠️</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filter nach Kategorie
          </label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'Alle Kategorien' : cat}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Suchen
          </label>
          <input
            type="text"
            placeholder="Nach Aktion oder IP suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={loadAuditLogs}
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            Aktualisieren
          </button>
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
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Logs List */}
      {!loading && !error && (
        <div className="space-y-3">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{actionIcons[log.action] || '📋'}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {actionLabels[log.action] || log.action}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {formatTime(log.timestamp)}
                        </p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="ml-11 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      {getDetailsLabel(log) && (
                        <p>📌 {getDetailsLabel(log)}</p>
                      )}
                      <p className="text-xs">
                        🌐 IP: {maskIP(log.ip_address)}
                      </p>
                    </div>
                  </div>

                  {/* Category Badge */}
                  <div className="ml-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getSeverityColor(log.action)}`}>
                      {actionCategories[log.action] || 'Sonstiges'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-600 dark:text-gray-400">
                {filter === 'all' ? 'Keine Audit-Logs vorhanden' : 'Keine Logs für diese Kategorie'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Stats Summary */}
      {!loading && !error && logs.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">Einträge angezeigt</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredLogs.length}</p>
            </div>
            {Object.entries(
              logs.reduce((acc, log) => {
                const cat = actionCategories[log.action] || 'Sonstiges'
                acc[cat] = (acc[cat] || 0) + 1
                return acc
              }, {})
            ).map(([cat, count]) => (
              <div key={cat} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">{cat}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
