
import React from 'react'
import ThemeToggle from '../ui/ThemeToggle'

export default function AuthHeader({ backHref }) {
	return (
		<header className="w-full py-4 px-6 flex items-center justify-between">
			<div className="flex items-center gap-3">
				<a href={backHref || '/'} className="flex items-center">
					<img src="/vite.svg" alt="Logo" className="h-8 mr-2" />
					<span className="text-lg font-semibold text-gray-900 dark:text-white">PWManager</span>
				</a>
				{backHref && (
					<a href={backHref} className="text-sm text-gray-600 dark:text-gray-300 ml-3 hover:underline">Zurück</a>
				)}
			</div>

			<div className="flex items-center gap-3">
				<ThemeToggle />
			</div>
		</header>
	)
}
