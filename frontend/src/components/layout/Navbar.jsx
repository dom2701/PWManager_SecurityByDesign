import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ThemeToggle from '../ui/ThemeToggle'
import { clearSession } from '../../hooks/useSession'
import { logoutUser } from '../../services/auth'
import { useAutoLogoutContext } from '../../context/AutoLogoutContext'

export default function Navbar() {
  const { remainingSeconds } = useAutoLogoutContext()

  function formatTime(sec) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <header className="antialiased">
      <nav className="bg-white border-b border-gray-200 px-4 lg:px-6 py-2.5 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center">
              <img src="/vite.svg" alt="Logo" className="h-8 mr-3" />
              <span className="text-xl font-semibold dark:text-white">PWManager</span>
            </Link>
          </div>
          
          {/* Right side */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 tabular-nums">
              🕒 Auto-Logout: {formatTime(remainingSeconds)}
            </span>
            <ThemeToggle />
            <UserDropdown />
          </div>
        </div>
      </nav>
    </header>
  )
}

    function UserDropdown() {
      const [open, setOpen] = useState(false)
      const [loggingOut, setLoggingOut] = useState(false)
      const ref = useRef(null)

      useEffect(() => {
        function handleClick(e) {
          if (ref.current && !ref.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
      }, [])

      async function handleLogout() {
        setLoggingOut(true)
        try {
          // Call backend logout endpoint
          await logoutUser()
        } catch (err) {
          console.warn('Logout error:', err)
        } finally {
          // Clear session and redirect regardless of backend response
          clearSession()
          window.location.href = '/login'
        }
      }

      return (
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(o => !o)}
            aria-haspopup="true"
            aria-expanded={open}
            className="flex items-center text-sm bg-white dark:bg-gray-800 border-2 border-blue-500 dark:border-gray-200 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <img src="https://png.pngtree.com/png-clipart/20210915/ourmid/pngtree-avatar-icon-abstract-user-login-icon-png-image_3917181.jpg" alt="user" className="w-8 h-8 rounded-full" />
          </button>

          {open && (
            <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
              <div className="py-1" role="menu" aria-orientation="vertical">
                <a href="/profile" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 dark:text-gray-100 dark:hover:bg-indigo-900/30 transition-colors" role="menuitem">Profil bearbeiten</a>
                <a href="/audits" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 dark:text-gray-100 dark:hover:bg-indigo-900/30 transition-colors" role="menuitem">Audits</a>
                <button 
                  onClick={() => { setOpen(false); handleLogout() }} 
                  disabled={loggingOut}
                  className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 dark:text-gray-100 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-60" 
                  role="menuitem"
                >
                  {loggingOut ? 'Wird abgemeldet...' : 'Logout'}
                </button>
              </div>
            </div>
          )}
        </div>
      )
    }
