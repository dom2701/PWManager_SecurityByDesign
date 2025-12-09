import React, { useState, useEffect, useRef } from 'react'
import { useMFA } from '../hooks/useMFA'

export const MFASetupModal = ({ isOpen, onClose, onSuccess }) => {
  const { loading, error, mfaSetupData, initializeMFA, confirmMFA, clearError } = useMFA()
  const [code, setCode] = useState('')
  const [step, setStep] = useState('init') // 'init' | 'verify' | 'backup'
  const [backupCodesVisible, setBackupCodesVisible] = useState(false)
  const [backupCodesCopied, setBackupCodesCopied] = useState(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (isOpen && step === 'init' && !initializedRef.current) {
      initializedRef.current = true
      const handleInitMFA = async () => {
        try {
          await initializeMFA()
          setStep('verify')
        } catch (err) {
          console.error('MFA initialization failed:', err)
        }
      }
      handleInitMFA()
    }
  }, [isOpen, step, initializeMFA])

  const handleVerifyCode = async (e) => {
    e.preventDefault()
    if (code.length !== 6) {
      clearError()
      alert('Code muss 6 Ziffern sein')
      return
    }

    try {
      await confirmMFA(code)

      const hasBackup = Array.isArray(mfaSetupData?.backup_codes) && mfaSetupData.backup_codes.length > 0

      if (hasBackup) {
        setStep('backup')
      } else {
        onSuccess?.()
        handleClose()
      }
    } catch (err) {
      console.error('Code verification failed:', err)
      setCode('')
    }
  }

  const handleCopyBackupCodes = () => {
    if (mfaSetupData?.backup_codes) {
      const text = mfaSetupData.backup_codes.join('\n')
      navigator.clipboard.writeText(text)
      setBackupCodesCopied(true)
      setTimeout(() => setBackupCodesCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setCode('')
    setStep('init')
    setBackupCodesVisible(false)
    clearError()
    onClose()
  }

  const handleConfirmBackupCodes = () => {
    onSuccess?.()
    handleClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          aria-label="Schließen"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Zwei-Faktor-Authentifizierung aktivieren
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Step 1: QR Code */}
        {step === 'verify' && mfaSetupData && (
          <div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Scannen Sie diesen QR-Code mit einer Authentifizierungs-App (Google Authenticator, Authy, etc.):
            </p>
            {mfaSetupData.qr_code && (
              <div className="mb-6 flex justify-center">
                <img
                  src={mfaSetupData.qr_code.startsWith('data:image') ? mfaSetupData.qr_code : `data:image/png;base64,${mfaSetupData.qr_code}`}
                  alt="MFA QR Code"
                  className="w-48 h-48"
                />
              </div>
            )}
            <form onSubmit={handleVerifyCode}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                6-stelliger Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength="6"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white mb-4"
                placeholder="000000"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
              >
                {loading ? 'Verifiziere...' : 'Code verifizieren'}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Backup Codes */}
        {step === 'backup' && mfaSetupData && (
          <div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Speichern Sie diese Sicherungs-Codes an einem sicheren Ort. Sie können diese verwenden, wenn Sie Ihre Authentifizierungs-App nicht haben:
            </p>
            <div className="mb-4">
              <button
                onClick={() => setBackupCodesVisible(!backupCodesVisible)}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-2"
              >
                {backupCodesVisible ? 'Codes verbergen' : 'Codes anzeigen'}
              </button>
              {backupCodesVisible && (
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mb-3 font-mono text-sm break-all text-gray-900 dark:text-gray-100">
                  {mfaSetupData.backup_codes?.join('\n')}
                </div>
              )}
              <button
                onClick={handleCopyBackupCodes}
                className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm mb-4 transition-colors"
              >
                {backupCodesCopied ? '✓ Kopiert' : 'Codes kopieren'}
              </button>
            </div>
            <button
              onClick={handleConfirmBackupCodes}
              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              Fertig
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && step === 'init' && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}
      </div>
    </div>
  )
}
