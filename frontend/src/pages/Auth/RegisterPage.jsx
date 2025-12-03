import React from 'react'
import AuthHeader from '../../components/auth/AuthHeader'
import RegisterForm from '../../components/auth/RegisterForm'
import Footer from '../../components/layout/Footer'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <AuthHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h1 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">Registrieren</h1>
            <p className="text-sm text-gray-500 mb-6">Erstelle einen neuen Account.</p>
            <RegisterForm />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
