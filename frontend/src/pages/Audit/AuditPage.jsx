import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuditLogs, getAuditLogDetails } from '../../services/api/endpoints'

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
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState('ALL')
  const [selectedLog, setSelectedLog] = useState(null)

  // Load audit logs on mount
  useEffect(() => {
    loadLogs()
  }, [])

  async function loadLogs() {
    setLoading(true)
    setError(null)
    try {
      const data = await getAuditLogs({ limit: 500 })
      console.log('Loaded audit logs:', data)
      setLogs(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load audit logs:', err)
      setError('Fehler beim Laden der Audit-Logs')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  async function handleViewDetails(logId) {
    try {
      const details = await getAuditLogDetails(logId)
      setSelectedLog(details)
    } catch (err) {
      console.error('Failed to load log details:', err)
      // Show the log from the list instead
      const log = logs.find(l => l.id === logId)
      setSelectedLog(log)
    }
  }

  // Filter and search
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.timestamp || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesAction = filterAction === 'ALL' || (log.action || '') === filterAction
    
    return matchesSearch && matchesAction
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-4 px-4 py-2 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-2"
        >
          <span>←</span> Zurück
        </button>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Audit-Protokoll
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Alle Aktivitäten und Änderungen
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded">
          {error}
        </div>
      )}

      {/* Content */}
      {!loading && (
        <>
          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="ALL">Alle Aktionen</option>
              <option value="CREATE">Erstellt</option>
              <option value="UPDATE">Aktualisiert</option>
              <option value="DELETE">Gelöscht</option>
              <option value="VIEW">Angesehen</option>
              <option value="LOGIN">Login</option>
            </select>
          </div>

          {/* Table */}
          {filteredLogs.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Zeitstempel</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Benutzer</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Aktion</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {log.timestamp}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {log.user || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${actionColors[log.action] || 'bg-gray-100 text-gray-800'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleViewDetails(log.id)}
                          className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400">Keine Audit-Logs gefunden</p>
            </div>
          )}

          {/* Summary */}
          <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
            {filteredLogs.length} von {logs.length} Einträgen angezeigt
          </div>
        </>
      )}

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Zeitstempel</p>
                <p className="text-gray-900 dark:text-white">{selectedLog.timestamp}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Benutzer</p>
                <p className="text-gray-900 dark:text-white">{selectedLog.user || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Aktion</p>
                <p className="text-gray-900 dark:text-white">{selectedLog.action}</p>
              </div>
              {selectedLog.details && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Details</p>
                  <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs overflow-auto max-h-48 text-gray-900 dark:text-gray-100">
                    {typeof selectedLog.details === 'string' 
                      ? selectedLog.details 
                      : JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2 justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
