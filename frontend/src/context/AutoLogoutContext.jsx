import React, { createContext, useContext } from 'react'
import { useAutoLogout } from '../hooks/useAutoLogout'

const AutoLogoutContext = createContext({ remainingSeconds: 900 })

export function AutoLogoutProvider({ children }) {
  const remainingSeconds = useAutoLogout(15)
  
  return (
    <AutoLogoutContext.Provider value={{ remainingSeconds }}>
      {children}
    </AutoLogoutContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAutoLogoutContext() {
  return useContext(AutoLogoutContext)
}
