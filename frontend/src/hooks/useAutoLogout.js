import { useEffect, useRef, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logoutUser } from '../services/auth'

/**
 * Auto-logout hook that logs out user after inactivity timeout
 * @param {number} timeoutMinutes - Minutes of inactivity before logout (default: 15)
 * @returns {number} remainingSeconds - Seconds remaining until logout
 */
export function useAutoLogout(timeoutMinutes = 15) {
  const navigate = useNavigate()
  const timeoutRef = useRef(null)
  const intervalRef = useRef(null)
  const lastActivityRef = useRef(Date.now())
  const timeoutMs = timeoutMinutes * 60 * 1000
  const [remainingSeconds, setRemainingSeconds] = useState(timeoutMinutes * 60)

  const resetTimer = useCallback(() => {
    // Update last activity time
    lastActivityRef.current = Date.now()
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Reset remaining time display
    setRemainingSeconds(timeoutMinutes * 60)

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      try {
        await logoutUser()
      } catch (err) {
        console.error('Auto-logout error:', err)
      } finally {
        navigate('/login', { state: { message: 'Automatisch abgemeldet nach Inaktivität' } })
      }
    }, timeoutMs)
  }, [timeoutMs, timeoutMinutes, navigate])

  useEffect(() => {
    // Events that reset the inactivity timer
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']

    // Reset timer on any activity
    events.forEach(event => {
      window.addEventListener(event, resetTimer)
    })

    // Initialize timer
    resetTimer()

    // Update countdown display every second
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current
      const remaining = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000))
      setRemainingSeconds(remaining)
    }, 1000)

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      events.forEach(event => {
        window.removeEventListener(event, resetTimer)
      })
    }
  }, [resetTimer, timeoutMs])

  return remainingSeconds
}
