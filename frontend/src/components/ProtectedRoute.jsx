/**
 * ProtectedRoute Component
 * Blocks access to authenticated routes if user is not logged in
 */

import React, { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { getCurrentUser, fetchCSRFToken } from '../services/auth'

export default function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null) // null = loading

  useEffect(() => {
    async function checkAuth() {
      try {
        // Verify session by calling /auth/me endpoint
        const user = await getCurrentUser()
        if (user) {
          // Fetch CSRF token
          try {
            await fetchCSRFToken()
            // Double check if token was actually set
            const token = await import('../services/api/client').then(m => m.getCSRFToken())
            if (token) {
              setIsAuthenticated(true)
            } else {
              console.error('CSRF token not set after fetch')
              setIsAuthenticated(false)
            }
          } catch (e) {
            console.error('Failed to fetch CSRF token', e)
            setIsAuthenticated(false)
          }
        } else {
          setIsAuthenticated(false)
        }
      } catch (err) {
        // If any error, user is not authenticated
        console.debug('Auth check failed:', err?.message)
        setIsAuthenticated(false)
      }
    }

    checkAuth()
  }, [])

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Wird geladen...</p>
        </div>
      </div>
    )
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Authenticated - render protected component
  return children
}
