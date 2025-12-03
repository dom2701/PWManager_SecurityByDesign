export default function Footer() {
  return (
    <footer className="py-3 px-4 bg-white dark:bg-gray-800">
      <div className="mx-auto max-w-screen-xl text-center">
        <p className="flex justify-center items-center text-lg font-semibold text-gray-900 dark:text-white">
          <svg className="mr-2 h-6 w-6" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" />
          </svg>
          PWManager
        </p>

        <p className="my-3 text-sm text-gray-500 dark:text-gray-400">Entwickelt im Modul Security by Design.</p>

        <ul className="flex flex-wrap justify-center items-center gap-4 mb-3 text-gray-900 dark:text-white text-sm">
          <li>
            <a href="#" className="hover:underline">About</a>
          </li>
          <li>
            <a href="#" className="hover:underline">Blog</a>
          </li>
          <li>
            <a href="#" className="hover:underline">Contact</a>
          </li>
        </ul>

        <span className="text-xs text-gray-500 sm:text-center dark:text-gray-400">© {new Date().getFullYear()} PWManager. All Rights Reserved.</span>
      </div>
    </footer>
  )
}
