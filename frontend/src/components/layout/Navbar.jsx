import React, { useState, useRef, useEffect } from 'react'
import ThemeToggle from '../ui/ThemeToggle'
import CountdownTimer from '../ui/CountdownTimer'
import { clearSession } from '../../hooks/useSession'
import { handleLogout } from '../../handlers/authHandlers'

export default function Navbar() {
  return (
    <header className="antialiased">
      <nav className="bg-white border-b border-gray-200 px-4 lg:px-6 py-2.5 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center">
              <img src="/vite.svg" alt="Logo" className="h-8 mr-3" />
              <span className="text-xl font-semibold dark:text-white">PWManager</span>
            </a>
          </div>
          
          {/* Right side */}
          <div className="flex items-center gap-8">
            <ThemeToggle />
            <CountdownTimer initialSeconds={15 * 60} onExpire={() => console.log('Logout!')} />
            <UserDropdown />
          </div>
        </div>
      </nav>
    </header>
  )
}

    function UserDropdown() {
      const [open, setOpen] = useState(false)
      const ref = useRef(null)

      useEffect(() => {
        function handleClick(e) {
          if (ref.current && !ref.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
      }, [])

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
                <button onClick={() => { setOpen(false); try { handleLogout() } catch (e) { console.warn(e) } clearSession(); window.location.href = '/login' }} className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 dark:text-gray-100 dark:hover:bg-indigo-900/30 transition-colors" role="menuitem">Logout</button>
              </div>
            </div>
          )}
        </div>
      )
    }
