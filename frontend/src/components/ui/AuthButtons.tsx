// defines which parameters can be passed to the AuthButtons component

interface AuthButtonsProps {
    variant?: 'login' | 'register' | 'secondary'
    loading?: boolean
    disabled?: boolean
    onClick: () => void
    children: React.ReactNode
    className?: string
}

export default function AuthButtons({
    variant = 'login',
    loading = false,
    disabled = false,
    onClick,
    children,
    className = '',
}: AuthButtonsProps) {
    const baseClasses = 'px-4 py-2 rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition'
    const variants = {
        login: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        register: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
    }

    return (
        <button
        onClick={onClick}
        disabled={loading || disabled}
        className={`${baseClasses} ${variants[variant]} ${loading ? 'opacity-75 cursor-not-allowed' : ''} ${className}`}
        aria-label={loading ? 'Laden...' : `${children}`}
        >
        {loading ? (
            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
            {/* Spinner SVG */}
            </svg>
        ) : null}
        {children}
        </button>
  )
}