import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/Auth/LoginPage'
import RegisterPage from './pages/Auth/RegisterPage'
import DashboardPage from './pages/Dashboard/DashboardPage'
import VaultPage from './pages/Vault/VaultPage'
import AuditPage from './pages/Audit/AuditPage'
import SettingsPage from './pages/Settings/SettingsPage'
import LayoutWrapper from './components/layout/LayoutWrapper'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<LayoutWrapper><DashboardPage /></LayoutWrapper>} />
        <Route path="/vault/:vaultId" element={<LayoutWrapper><VaultPage /></LayoutWrapper>} />
        <Route path="/audits" element={<LayoutWrapper><AuditPage /></LayoutWrapper>} />
        <Route path="/profile" element={<LayoutWrapper><SettingsPage /></LayoutWrapper>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
