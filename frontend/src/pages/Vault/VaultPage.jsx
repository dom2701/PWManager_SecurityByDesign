import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

// Statische Vault-Daten
const vaultsData = {
  1: {
    id: 1,
    name: 'Persönlich',
    description: 'Private Accounts und Passwörter',
    icon: '🔐',
    color: 'bg-blue-500',
    entries: [
      { id: 1, title: 'Gmail', username: 'max@gmail.com', password: 'SuperSecret123!', url: 'https://gmail.com', category: 'Email', lastModified: '2024-12-01' },
      { id: 2, title: 'Netflix', username: 'max.mustermann', password: 'Netflix2024#', url: 'https://netflix.com', category: 'Entertainment', lastModified: '2024-11-28' },
      { id: 3, title: 'Amazon', username: 'max@gmail.com', password: 'AmazonPrime99', url: 'https://amazon.de', category: 'Shopping', lastModified: '2024-11-25' },
      { id: 4, title: 'Spotify', username: 'max.music', password: 'Music2024!', url: 'https://spotify.com', category: 'Entertainment', lastModified: '2024-11-20' },
      { id: 5, title: 'PayPal', username: 'max@gmail.com', password: 'PayPal$ecure88', url: 'https://paypal.com', category: 'Finance', lastModified: '2024-11-15' },
      { id: 6, title: 'Dropbox', username: 'max@gmail.com', password: 'CloudStore456', url: 'https://dropbox.com', category: 'Cloud', lastModified: '2024-11-10' },
      { id: 7, title: 'LinkedIn', username: 'max.mustermann', password: 'Career2024!', url: 'https://linkedin.com', category: 'Social', lastModified: '2024-11-05' },
      { id: 8, title: 'GitHub', username: 'maxmustermann', password: 'Code2024#', url: 'https://github.com', category: 'Development', lastModified: '2024-11-01' },
    ]
  },
  2: {
    id: 2,
    name: 'Arbeit',
    description: 'Firmen-Accounts und Tools',
    icon: '💼',
    color: 'bg-green-500',
    entries: [
      { id: 9, title: 'Slack', username: 'max@firma.de', password: 'SlackWork2024', url: 'https://firma.slack.com', category: 'Communication', lastModified: '2024-11-28' },
      { id: 10, title: 'Jira', username: 'max.mustermann', password: 'JiraProject99', url: 'https://firma.atlassian.net', category: 'Project Management', lastModified: '2024-11-27' },
      { id: 11, title: 'Microsoft 365', username: 'max@firma.de', password: 'Office365!Secure', url: 'https://office.com', category: 'Productivity', lastModified: '2024-11-26' },
      { id: 12, title: 'Zoom', username: 'max@firma.de', password: 'ZoomMeet2024', url: 'https://zoom.us', category: 'Communication', lastModified: '2024-11-25' },
    ]
  },
  3: {
    id: 3,
    name: 'Banking',
    description: 'Bank- und Finanz-Zugänge',
    icon: '🏦',
    color: 'bg-purple-500',
    entries: [
      { id: 13, title: 'Sparkasse Online', username: '12345678', password: 'Bank$ecure2024', url: 'https://sparkasse.de', category: 'Banking', lastModified: '2024-11-25' },
      { id: 14, title: 'N26', username: 'max@gmail.com', password: 'N26Secure!99', url: 'https://n26.com', category: 'Banking', lastModified: '2024-11-20' },
      { id: 15, title: 'Trade Republic', username: 'max@gmail.com', password: 'Trade2024#Stocks', url: 'https://traderepublic.com', category: 'Investment', lastModified: '2024-11-15' },
      { id: 16, title: 'Revolut', username: 'max@gmail.com', password: 'Revolut$Money', url: 'https://revolut.com', category: 'Banking', lastModified: '2024-11-10' },
      { id: 17, title: 'Crypto.com', username: 'max@gmail.com', password: 'Crypto2024!Safe', url: 'https://crypto.com', category: 'Crypto', lastModified: '2024-11-05' },
    ]
  },
  4: {
    id: 4,
    name: 'Social Media',
    description: 'Social Network Accounts',
    icon: '📱',
    color: 'bg-pink-500',
    entries: [
      { id: 18, title: 'Facebook', username: 'max.mustermann', password: 'FB2024Secure!', url: 'https://facebook.com', category: 'Social', lastModified: '2024-12-02' },
      { id: 19, title: 'Instagram', username: 'max_mustermann', password: 'Insta2024#Photo', url: 'https://instagram.com', category: 'Social', lastModified: '2024-12-01' },
      { id: 20, title: 'Twitter/X', username: 'maxmustermann', password: 'Twitter2024!X', url: 'https://twitter.com', category: 'Social', lastModified: '2024-11-30' },
      { id: 21, title: 'TikTok', username: 'max_mustermann', password: 'TikTok2024#Fun', url: 'https://tiktok.com', category: 'Social', lastModified: '2024-11-28' },
      { id: 22, title: 'Reddit', username: 'maxmustermann', password: 'Reddit2024!Karma', url: 'https://reddit.com', category: 'Social', lastModified: '2024-11-25' },
      { id: 23, title: 'Discord', username: 'max#1234', password: 'Discord2024#Chat', url: 'https://discord.com', category: 'Social', lastModified: '2024-11-20' },
    ]
  }
}

export default function VaultPage() {
  const { vaultId } = useParams()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [showPassword, setShowPassword] = useState({})
  const [copiedId, setCopiedId] = useState(null)

  const vault = vaultsData[vaultId]

  if (!vault) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Vault nicht gefunden</h2>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Zurück zum Dashboard
        </button>
      </div>
    )
  }

  const filteredEntries = vault.entries.filter(entry =>
    entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const togglePasswordVisibility = (entryId) => {
    setShowPassword(prev => ({ ...prev, [entryId]: !prev[entryId] }))
  }

  const copyToClipboard = async (text, entryId) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(entryId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

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
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div className={`${vault.color} w-16 h-16 rounded-lg flex items-center justify-center text-3xl`}>
              {vault.icon}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {vault.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">{vault.description}</p>
            </div>
          </div>
          <button
            onClick={() => alert('Neues Passwort hinzufügen (Funktion folgt)')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Neues Passwort
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Passwort suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pl-12 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <svg
            className="absolute left-4 top-3.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Entries List */}
      <div className="space-y-4">
        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {entry.title}
                  </h3>
                  <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs rounded-full">
                    {entry.category}
                  </span>
                </div>
                {entry.url && (
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {entry.url}
                  </a>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {entry.lastModified}
              </div>
            </div>

            {/* Username */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Benutzername
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={entry.username}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white"
                />
                <button
                  onClick={() => copyToClipboard(entry.username, `${entry.id}-username`)}
                  className="p-2 rounded-md bg-gray-100 hover:bg-indigo-100 dark:bg-gray-700 dark:hover:bg-indigo-900/40 text-gray-700 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 transition-all"
                  title="Kopieren"
                >
                  {copiedId === `${entry.id}-username` ? (
                    <span className="text-green-500 dark:text-green-400 text-lg">✓</span>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Passwort
              </label>
              <div className="flex items-center gap-2">
                <input
                  type={showPassword[entry.id] ? 'text' : 'password'}
                  value={entry.password}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white font-mono"
                />
                <button
                  onClick={() => togglePasswordVisibility(entry.id)}
                  className="p-2 rounded-md bg-gray-100 hover:bg-blue-100 dark:bg-gray-700 dark:hover:bg-blue-900/40 text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-all"
                  title={showPassword[entry.id] ? 'Verbergen' : 'Anzeigen'}
                >
                  {showPassword[entry.id] ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => copyToClipboard(entry.password, `${entry.id}-password`)}
                  className="p-2 rounded-md bg-gray-100 hover:bg-indigo-100 dark:bg-gray-700 dark:hover:bg-indigo-900/40 text-gray-700 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 transition-all"
                  title="Kopieren"
                >
                  {copiedId === `${entry.id}-password` ? (
                    <span className="text-green-500 dark:text-green-400 text-lg">✓</span>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredEntries.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-600 dark:text-gray-400">Keine Passwörter gefunden</p>
        </div>
      )}

      {/* Stats */}
      <div className="mt-8 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
        <p className="text-sm text-indigo-700 dark:text-indigo-300">
          📊 {filteredEntries.length} von {vault.entries.length} Einträgen angezeigt
        </p>
      </div>
    </div>
  )
}
