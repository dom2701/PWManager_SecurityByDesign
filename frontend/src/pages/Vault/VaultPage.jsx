import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getVault, getVaultEntries, createVaultEntry, updateVaultEntry, deleteVaultEntry } from '../../services/api/endpoints'
import { deriveKey, encryptData, decryptData } from '../../utils/crypto'
import { storeMasterPassword } from '../../utils/masterPassword'
import VaultEntryModal from '../../components/VaultEntryModal'

const CLIPBOARD_CLEAR_TIMEOUT = 15
const TEXT_CLIPBOARD_CLEARING = 'Zwischenablage wird bereinigt in...'
const TEXT_CLEAR_NOW = 'Jetzt löschen'

export default function VaultPage() {
  const { vaultId } = useParams()
  const navigate = useNavigate()
  
  const [vault, setVault] = useState(null)
  const [entries, setEntries] = useState([])
  const [decryptedEntries, setDecryptedEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [showPassword, setShowPassword] = useState({})
  const [copiedId, setCopiedId] = useState(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [modalMode, setModalMode] = useState('create')
  
  const [encryptionKey, setEncryptionKey] = useState(null)
  const [showMasterPasswordPrompt, setShowMasterPasswordPrompt] = useState(true)

  const [clipboardCountdown, setClipboardCountdown] = useState(0)
  const [lastCopiedText, setLastCopiedText] = useState(null)
  const [pendingClear, setPendingClear] = useState(false)

  // Clipboard countdown effect
  useEffect(() => {
    if (clipboardCountdown <= 0) return

    const interval = setInterval(() => {
      setClipboardCountdown((prev) => {
        if (prev <= 1) return 0
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [clipboardCountdown])

  const clearClipboardNow = useCallback(async () => {
    let success = false
    try {
      let shouldClear = true
      try {
        const currentClipboard = await navigator.clipboard.readText()
        if (currentClipboard !== lastCopiedText) {
          shouldClear = false
        }
      } catch (readErr) {
        console.warn('Could not read clipboard to verify content:', readErr)
        // If we can't read (e.g. permission denied), we proceed to clear
        // to ensure security, as we can't verify if the user copied something else.
      }

      if (shouldClear) {
        await navigator.clipboard.writeText('')
        success = true
      } else {
        // Content changed by user, so we consider it "cleared" (or at least we shouldn't overwrite)
        success = true
      }
    } catch (err) {
      console.error('Failed to clear clipboard using API:', err)
      // Fallback using execCommand
      try {
        const textArea = document.createElement("textarea")
        textArea.value = ""
        textArea.style.position = "fixed"
        textArea.style.left = "-9999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        const execSuccess = document.execCommand('copy')
        document.body.removeChild(textArea)
        if (execSuccess) success = true
      } catch (fallbackErr) {
        console.error('Fallback failed:', fallbackErr)
      }
    }

    if (success) {
      setLastCopiedText(null)
      setClipboardCountdown(0)
      setPendingClear(false)
    } else {
      // If failed (likely due to background tab restrictions), mark as pending
      // to retry when window regains focus
      console.warn('Clipboard clear failed - scheduling retry on focus')
      setPendingClear(true)
      setClipboardCountdown(0)
    }
  }, [lastCopiedText])

  // Retry clearing when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      if (pendingClear) {
        clearClipboardNow()
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [pendingClear, clearClipboardNow])

  // Handle clipboard clearing
  useEffect(() => {
    if (clipboardCountdown === 0 && lastCopiedText !== null) {
      clearClipboardNow()
    }
  }, [clipboardCountdown, lastCopiedText, clearClipboardNow])

  // Load vault and entries
  useEffect(() => {
    loadVault()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaultId])

  async function loadVault() {
    setLoading(true)
    setError(null)
    try {
      const vaultData = await getVault(vaultId)
      setVault(vaultData)
      
      const entriesData = await getVaultEntries(vaultId)
      setEntries(Array.isArray(entriesData) ? entriesData : [])
      
      // Always show master password prompt
      // Zero-Knowledge: User must enter password every time to decrypt
      setShowMasterPasswordPrompt(true)
    } catch (err) {
      console.error('Failed to load vault:', err)
      setError(err?.data?.error || 'Fehler beim Laden des Vaults')
    } finally {
      setLoading(false)
    }
  }

  // Unlock vault with master password
  async function handleUnlock(password) {
    const key = await deriveKey(password, vault.encryption_salt)
    
    // Verify password by attempting to decrypt at least one entry
    // This is the Zero-Knowledge verification: decryption will fail if password is wrong
    if (entries.length > 0) {
      try {
        await decryptData(entries[0].encrypted_data, entries[0].nonce, key)
      } catch {
        throw new Error('Falsches Master-Passwort. Die Entschlüsselung ist fehlgeschlagen.')
      }
    } else {
      // Empty vault - verify password using the validation hash stored during creation
      const validationData = localStorage.getItem(`vault_validation_${vaultId}`)
      if (validationData) {
        try {
          const { hash, nonce } = JSON.parse(validationData)
          await decryptData(hash, nonce, key)
        } catch {
          throw new Error('Falsches Master-Passwort. Die Validierungsdaten konnten nicht entschlüsselt werden.')
        }
      } else {
        // No validation hash found - might be an old vault created without this feature
        console.warn('Vault is empty and no validation hash found - cannot verify password.')
      }
    }
    
    // Password verification passed
    setEncryptionKey(key)
    storeMasterPassword(vaultId, password)
    setShowMasterPasswordPrompt(false)
    
    // Decrypt all entries
    if (entries.length > 0) {
      await decryptAllEntries(entries, key)
    }
  }

  // Decrypt all entries
  async function decryptAllEntries(encryptedEntries, key) {
    const decrypted = []
    for (const entry of encryptedEntries) {
      try {
        const data = await decryptData(entry.encrypted_data, entry.nonce, key)
        decrypted.push({
          ...entry,
          ...data
        })
      } catch (err) {
        console.error('Failed to decrypt entry:', entry.id, err)
      }
    }
    setDecryptedEntries(decrypted)
  }

  // Re-decrypt when entries change
  useEffect(() => {
    if (encryptionKey && entries.length > 0) {
      decryptAllEntries(entries, encryptionKey)
    } else if (encryptionKey && entries.length === 0) {
      // Clear decrypted entries if vault is empty
      setDecryptedEntries([])
    }
  }, [entries, encryptionKey])

  // Create entry
  async function handleCreateEntry(formData) {
    if (!encryptionKey) {
      throw new Error('Vault ist nicht entsperrt')
    }

    const { encrypted_data, nonce } = await encryptData(formData, encryptionKey)
    
    await createVaultEntry(vaultId, { encrypted_data, nonce })
    
    // Just reload entries without re-prompting for master password
    const entriesData = await getVaultEntries(vaultId)
    setEntries(Array.isArray(entriesData) ? entriesData : [])
    
    // Decrypt new entries with existing key
    if (encryptionKey && entriesData.length > 0) {
      await decryptAllEntries(entriesData, encryptionKey)
    }
  }

  // Update entry
  async function handleUpdateEntry(formData) {
    if (!encryptionKey || !editingEntry) {
      throw new Error('Vault ist nicht entsperrt')
    }

    const { encrypted_data, nonce } = await encryptData(formData, encryptionKey)
    
    await updateVaultEntry(editingEntry.id, { encrypted_data, nonce })
    
    // Just reload entries without re-prompting for master password
    const entriesData = await getVaultEntries(vaultId)
    setEntries(Array.isArray(entriesData) ? entriesData : [])
    
    // Decrypt updated entries with existing key
    if (encryptionKey && entriesData.length > 0) {
      await decryptAllEntries(entriesData, encryptionKey)
    }
  }

  // Delete entry
  async function handleDeleteEntry(entryId, entryTitle) {
    if (!confirm(`Eintrag "${entryTitle}" wirklich löschen?`)) {
      return
    }

    try {
      await deleteVaultEntry(entryId)
      
      // Just reload entries without re-prompting for master password
      const entriesData = await getVaultEntries(vaultId)
      setEntries(Array.isArray(entriesData) ? entriesData : [])
      
      // Decrypt remaining entries with existing key
      if (encryptionKey && entriesData.length > 0) {
        await decryptAllEntries(entriesData, encryptionKey)
      } else {
        // Clear decrypted entries if vault is now empty
        setDecryptedEntries([])
      }
    } catch (err) {
      console.error('Failed to delete entry:', err)
      setError('Fehler beim Löschen des Eintrags')
    }
  }

  // Copy to clipboard
  async function copyToClipboard(text, entryId) {
    try {
      // Try to request permission implicitly by reading (if possible)
      // This is a best-effort to "prime" the permission for later clearing
      try {
        await navigator.permissions.query({ name: 'clipboard-write' })
      } catch (e) {
        // Ignore permission query errors
      }

      await navigator.clipboard.writeText(text)
      setCopiedId(entryId)
      setTimeout(() => setCopiedId(null), 2000)
      
      // Reset countdown
      setClipboardCountdown(CLIPBOARD_CLEAR_TIMEOUT)
      setLastCopiedText(text)
      setPendingClear(false) // Reset pending state on new copy
    } catch (err) {
      console.error('Failed to copy:', err)
      // Fallback
      try {
        const textArea = document.createElement("textarea")
        textArea.value = text
        textArea.style.position = "fixed"
        textArea.style.left = "-9999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        
        setCopiedId(entryId)
        setTimeout(() => setCopiedId(null), 2000)
        setClipboardCountdown(CLIPBOARD_CLEAR_TIMEOUT)
        setLastCopiedText(text)
        setPendingClear(false)
      } catch (fbErr) {
        console.error('Copy fallback failed:', fbErr)
      }
    }
  }

  // Toggle password visibility
  function togglePasswordVisibility(entryId) {
    setShowPassword(prev => ({ ...prev, [entryId]: !prev[entryId] }))
  }

  // Open modal for creating
  function openCreateModal() {
    setModalMode('create')
    setEditingEntry(null)
    setIsModalOpen(true)
  }

  // Open modal for editing
  function openEditModal(entry) {
    setModalMode('edit')
    setEditingEntry(entry)
    setIsModalOpen(true)
  }

  // Filter entries
  const filteredEntries = decryptedEntries.filter(entry =>
    entry.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.url?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // Error state
  if (error && !vault) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Fehler</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Zurück zum Dashboard
        </button>
      </div>
    )
  }

  // Master password prompt
  if (showMasterPasswordPrompt && vault) {
    return <MasterPasswordPrompt vault={vault} onUnlock={handleUnlock} onCancel={() => navigate('/dashboard')} />
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="h-6 w-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                🔐 {vault?.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                {decryptedEntries.length} {decryptedEntries.length === 1 ? 'Eintrag' : 'Einträge'}
              </p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Neuer Eintrag
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Einträge durchsuchen..."
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

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded text-sm">
          {error}
        </div>
      )}

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? 'Keine Einträge gefunden' : 'Noch keine Einträge vorhanden. Erstelle deinen ersten Eintrag!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {entry.title}
                  </h3>
                  {entry.username && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      👤 {entry.username}
                    </p>
                  )}
                  {entry.url && (
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      🔗 {entry.url}
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(entry)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Bearbeiten"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteEntry(entry.id, entry.title)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Löschen"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Password field */}
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                <span className="text-sm font-mono text-gray-900 dark:text-white flex-1">
                  {showPassword[entry.id] ? entry.password : '••••••••••••'}
                </span>
                <button
                  onClick={() => togglePasswordVisibility(entry.id)}
                  className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  title={showPassword[entry.id] ? 'Verbergen' : 'Anzeigen'}
                >
                  {showPassword[entry.id] ? '🙈' : '👁️'}
                </button>
                <button
                  onClick={() => copyToClipboard(entry.password, entry.id)}
                  className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Kopieren"
                >
                  {copiedId === entry.id ? '✅' : '📋'}
                </button>
              </div>

              {/* Notes */}
              {entry.notes && (
                <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                  📝 {entry.notes}
                </div>
              )}

              {/* Metadata */}
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                Zuletzt bearbeitet: {entry.updated_at ? new Date(entry.updated_at).toLocaleString('de-DE') : 'Unbekannt'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <VaultEntryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingEntry(null)
        }}
        onSubmit={modalMode === 'edit' ? handleUpdateEntry : handleCreateEntry}
        entry={editingEntry}
        mode={modalMode}
      />

      {/* Clipboard Countdown Progress Bar */}
      {clipboardCountdown > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg z-50">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {TEXT_CLIPBOARD_CLEARING}
                </span>
                <span 
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  aria-live="polite"
                >
                  {clipboardCountdown}s
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div 
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-1000 ease-linear" 
                  style={{ width: `${(clipboardCountdown / CLIPBOARD_CLEAR_TIMEOUT) * 100}%` }}
                  role="progressbar"
                  aria-valuenow={clipboardCountdown}
                  aria-valuemin={0}
                  aria-valuemax={CLIPBOARD_CLEAR_TIMEOUT}
                  aria-label={`Clipboard will be cleared in ${clipboardCountdown} seconds`}
                ></div>
              </div>
            </div>
            <button
              onClick={clearClipboardNow}
              className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-red-200 dark:border-red-800 transition-colors"
            >
              {TEXT_CLEAR_NOW}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Master Password Prompt Component
function MasterPasswordPrompt({ vault, onUnlock, onCancel }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await onUnlock(password)
    } catch (err) {
      setError(err?.message || 'Fehler beim Entsperren')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Vault entsperren
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {vault.name}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded text-sm">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Master-Passwort
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Master-Passwort eingeben"
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
              autoFocus
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Das Master-Passwort wird verwendet, um die Einträge in diesem Vault zu entschlüsseln
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors disabled:opacity-60"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-60"
            >
              {loading ? 'Entsperre...' : 'Entsperren'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
