function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-xl w-full text-center p-10 bg-white/90 dark:bg-gray-800/60 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
        <h1 className="text-4xl font-extrabold mb-4">Willkommen bei unserem PWManager</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">TailwindCss erfolgreich eingebunden.</p>

        <div className="flex justify-center gap-3">
          <a href="#" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Los geht's</a>
          <a href="#" className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200">Mehr erfahren</a>
        </div>

        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">Vite + React + Tailwind</p>
      </div>
    </div>
  )
}

export default App
