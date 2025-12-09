import { useState } from 'react'
import { setupMFA, verifyMFA, disableMFA } from '../services/api/endpoints'

export const useMFA = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mfaSetupData, setMfaSetupData] = useState(null)

  const initializeMFA = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await setupMFA()
      setMfaSetupData(response)
      return response
    } catch (err) {
      const errorMessage = err?.data?.error || err?.message || 'MFA setup failed'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const confirmMFA = async (code) => {
    try {
      setLoading(true)
      setError(null)
      const response = await verifyMFA(code)
      return response
    } catch (err) {
      const errorMessage = err?.data?.error || err?.message || 'MFA verification failed'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const removeMFA = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await disableMFA()
      setMfaSetupData(null)
      return response
    } catch (err) {
      const errorMessage = err?.data?.error || err?.message || 'MFA disable failed'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const clearError = () => setError(null)

  return {
    loading,
    error,
    mfaSetupData,
    initializeMFA,
    confirmMFA,
    removeMFA,
    clearError,
  }
}
