import React, { ReactNode } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import { AutoLogoutProvider } from '../../context/AutoLogoutContext'

type Props = {
	children: ReactNode
}

export default function LayoutWrapper({ children }: Props) {
	return (
		<AutoLogoutProvider>
			<div className="min-h-screen w-full flex flex-col bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
			<header>
				<Navbar />
			</header>

			<main className="flex-1 w-full px-4 py-6">
				{children}
			</main>

				<Footer />
			</div>
		</AutoLogoutProvider>
	)
}
