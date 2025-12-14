import { logoutUser as logoutUserAPI } from '../services/auth'
import { clearAllMasterPasswords } from '../utils/masterPassword'
import { setCSRFToken } from '../services/api/client'

const INACTIVITY_MS = 15 * 60 * 1000 // 15 minutes

let timeoutId = null
let listenersAttached = false

function toMs() {
  return INACTIVITY_MS
}

function clearTimer() {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
}

function expireSession() {
  // call backend logout, clear client tokens
  try {
    logoutUserAPI()
  } catch {
    // ignore
  }
  clearSession()
  // navigate to login
  try { window.location.href = '/login' } catch { /* ignore */ }
}

function resetTimer() {
  clearTimer()
  timeoutId = setTimeout(() => {
    expireSession()
  }, toMs())
}

function activityHandler() {
  resetTimer()
}

function attachListeners() {
  if (listenersAttached) return
  listenersAttached = true
  window.addEventListener('mousemove', activityHandler)
  window.addEventListener('mousedown', activityHandler)
  window.addEventListener('keydown', activityHandler)
  window.addEventListener('touchstart', activityHandler)
  window.addEventListener('scroll', activityHandler)
}

function detachListeners() {
  if (!listenersAttached) return
  listenersAttached = false
  window.removeEventListener('mousemove', activityHandler)
  window.removeEventListener('mousedown', activityHandler)
  window.removeEventListener('keydown', activityHandler)
  window.removeEventListener('touchstart', activityHandler)
  window.removeEventListener('scroll', activityHandler)
}

export function startSession(token) {
  try { if (token) localStorage.setItem('authToken', token) } catch { /* ignore */ }
  attachListeners()
  resetTimer()
}

export function clearSession() {
  clearTimer()
  detachListeners()
  try { localStorage.removeItem('authToken') } catch { /* ignore */ }
  try { sessionStorage.clear() } catch { /* ignore */ }
  clearAllMasterPasswords()
  setCSRFToken(null)
}

export function useSession() {
  return { startSession, resetTimer, clearSession }
}

export default useSession
