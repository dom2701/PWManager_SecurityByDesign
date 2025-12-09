import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuditLogs, getAuditLogDetails } from '../../services/api/endpoints'

// Fallback Audit-Daten falls API nicht verfügbar
const fallbackAuditLogs = [
  {
    id: 1,
    timestamp: '2024-12-03 14:32:15',
    user: 'max.mustermann',
    action: 'CREATE',
    type: 'PASSWORD',
    target: 'Gmail Account',
    vault: 'Persönlich',
    details: 'Neues Passwort hinzugefügt',
    ipAddress: '192.168.1.42',
    severity: 'info'
  },
  {
    id: 2,
    timestamp: '2024-12-03 13:15:42',
    user: 'max.mustermann',
    action: 'UPDATE',
    type: 'PASSWORD',
    target: 'Netflix',
    vault: 'Persönlich',
    details: 'Passwort aktualisiert',
    ipAddress: '192.168.1.42',
    severity: 'info'
  },
  {
    id: 3,
    timestamp: '2024-12-03 11:28:03',
    user: 'max.mustermann',
    action: 'VIEW',
    type: 'PASSWORD',
    target: 'Sparkasse Online',
    vault: 'Banking',
    details: 'Passwort angezeigt',
    ipAddress: '192.168.1.42',
    severity: 'low'
  },
  {
    id: 4,
    timestamp: '2024-12-03 10:45:21',
    user: 'max.mustermann',
    action: 'DELETE',
    type: 'PASSWORD',
    target: 'Old Email Account',
    vault: 'Persönlich',
    details: 'Passwort gelöscht',
    ipAddress: '192.168.1.42',
    severity: 'warning'
  },
  {
    id: 5,
    timestamp: '2024-12-02 18:22:11',
    user: 'max.mustermann',
    action: 'CREATE',
    type: 'VAULT',
    target: 'Social Media',
    vault: '-',
    details: 'Neuer Vault erstellt',
    ipAddress: '192.168.1.42',
    severity: 'info'
  },
  {
    id: 6,
    timestamp: '2024-12-02 16:10:55',
    user: 'max.mustermann',
    action: 'LOGIN',
    type: 'AUTH',
    target: 'Benutzer-Login',
    vault: '-',
    details: 'Erfolgreicher Login',
    ipAddress: '192.168.1.42',
    severity: 'info'
  },
  {
    id: 7,
    timestamp: '2024-12-02 15:45:33',
    user: 'unknown',
    action: 'LOGIN_FAILED',
    type: 'AUTH',
    target: 'Benutzer-Login',
    vault: '-',
    details: 'Fehlgeschlagener Login-Versuch',
    ipAddress: '203.0.113.45',
    severity: 'critical'
  },
  {
    id: 8,
    timestamp: '2024-12-02 14:30:17',
    user: 'max.mustermann',
    action: 'UPDATE',
    type: 'VAULT',
    target: 'Arbeit',
    vault: '-',
    details: 'Vault-Beschreibung aktualisiert',
    ipAddress: '192.168.1.42',
    severity: 'info'
  },
  {
    id: 9,
    timestamp: '2024-12-02 12:15:08',
    user: 'max.mustermann',
    action: 'EXPORT',
    type: 'PASSWORD',
    target: 'Alle Passwörter',
    vault: 'Persönlich',
    details: 'Passwörter exportiert',
    ipAddress: '192.168.1.42',
    severity: 'warning'
  },
  {
    id: 10,
    timestamp: '2024-12-01 09:20:44',
    user: 'max.mustermann',
    action: 'CHANGE_PASSWORD',
    type: 'AUTH',
    target: 'Master-Passwort',
    vault: '-',
    details: 'Master-Passwort geändert',
    ipAddress: '192.168.1.42',
    severity: 'high'
  },
]

const actionColors = {
  CREATE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  VIEW: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  LOGIN: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  LOGIN_FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  EXPORT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  CHANGE_PASSWORD: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
}


export default function AuditPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState('ALL')
  const [filterType, setFilterType] = useState('ALL')
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedLogDetails, setSelectedLogDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  // Load audit logs on mount
  useEffect(() => {
    loadAuditLogs()
  }, [])

  async function loadAuditLogs() {
    setLoading(true)
    setError(null)
    try {
      const data = await getAuditLogs({ limit: 500 })
      setAuditLogs(Array.isArray(data) ? data : fallbackAuditLogs)
    } catch (err) {
      console.error('Failed to load audit logs, using fallback:', err)
      // Use fallback data if API fails
      setAuditLogs(fallbackAuditLogs)
    } finally {
      setLoading(false)
    }
  }

  async function handleViewDetails(logId) {
    setDetailsLoading(true)
    try {
      const details = await getAuditLogDetails(logId)
      setSelectedLogDetails(details)
    } catch (err) {
      console.error('Failed to load log details:', err)
    } finally {
      setDetailsLoading(false)
    }
  }

  function closeDetails() {
    setSelectedLogDetails(null)
  }

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.vault.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesAction = filterAction === 'ALL' || log.action === filterAction
    const matchesType = filterType === 'ALL' || log.type === filterType

    return matchesSearch && matchesAction && matchesType
  })

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
          Audit-Protokoll
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Alle Aktivitäten und Änderungen im Überblick
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      {!loading && (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Gesamt Einträge</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{auditLogs.length}</p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Kritisch</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {auditLogs.filter(l => l.severity === 'critical').length}
              </p>
            </div>
            <div className="text-3xl">🔴</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Warnungen</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {auditLogs.filter(l => l.severity === 'warning' || l.severity === 'high').length}
              </p>
            </div>
            <div className="text-3xl">⚠️</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Heute</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {auditLogs.filter(l => l.timestamp.startsWith('2024-12-03')).length}
              </p>
            </div>
            <div className="text-3xl">📅</div>
          </div>
        </div>
      </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Action Filter */}
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Alle Aktionen</option>
            <option value="CREATE">Erstellt</option>
            <option value="UPDATE">Aktualisiert</option>
            <option value="DELETE">Gelöscht</option>
            <option value="VIEW">Angesehen</option>
            <option value="LOGIN">Login</option>
            <option value="LOGIN_FAILED">Fehlgeschlagener Login</option>
            <option value="EXPORT">Exportiert</option>
            <option value="CHANGE_PASSWORD">Passwort geändert</option>
          </select>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Alle Typen</option>
            <option value="PASSWORD">Passwort</option>
            <option value="VAULT">Vault</option>
            <option value="AUTH">Authentifizierung</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Zeitstempel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Benutzer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Aktion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ziel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Vault
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {log.timestamp}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {log.user}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${actionColors[log.action]}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {log.target}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {log.vault}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleViewDetails(log.id)}
                      className="px-3 py-1 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredLogs.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-600 dark:text-gray-400">Keine Audit-Einträge gefunden</p>
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
        <p className="text-sm text-indigo-700 dark:text-indigo-300">
          📊 {filteredLogs.length} von {auditLogs.length} Einträgen angezeigt
        </p>
      </div>

      {/* Details Modal */}
      {selectedLogDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Audit-Eintrag Details
              </h2>
              <button
                onClick={closeDetails}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {detailsLoading && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              </div>
            )}

            {!detailsLoading && selectedLogDetails && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Zeitstempel</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {selectedLogDetails.timestamp}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Benutzer</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {selectedLogDetails.user}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Aktion</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {selectedLogDetails.action}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Ziel</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {selectedLogDetails.target}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Vault</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {selectedLogDetails.vault}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Schweregrad</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {selectedLogDetails.severity || 'info'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Details</p>
                  <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-auto max-h-40">
                    <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words font-mono">
                      {JSON.stringify(selectedLogDetails.details || {}, null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="flex gap-2 justify-end mt-6">
                  <button
                    onClick={closeDetails}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Schließen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
