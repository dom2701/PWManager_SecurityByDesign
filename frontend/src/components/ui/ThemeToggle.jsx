import { useEffect, useState } from 'react'

export default function ThemeToggle({ className = '' }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = localStorage.getItem('theme')
      if (stored === 'dark') return true
      if (stored === 'light') return false
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch {
      return false
    }
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) root.classList.add('dark')
    else root.classList.remove('dark')
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light')
    } catch {
        // ignore
    }
  }, [isDark])

  const toggle = () => setIsDark((v) => !v)

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-md focus:outline-none focus:ring-2 bg-white dark:bg-transparent border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-colors duration-150 ${className}`}
    >
      {isDark ? '🌙 Dark' : '☀️ Light'}
    </button>
  )
}