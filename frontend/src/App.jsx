import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/Auth/LoginPage'
import RegisterPage from './pages/Auth/RegisterPage'
import DashboardPage from './pages/Dashboard/DashboardPage'
import VaultPage from './pages/Vault/VaultPage'
import AuditPage from './pages/Audit/AuditPage'
import SettingsPage from './pages/Settings/SettingsPage'
import LayoutWrapper from './components/layout/LayoutWrapper'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Protected routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <LayoutWrapper><DashboardPage /></LayoutWrapper>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/vault/:vaultId" 
          element={
            <ProtectedRoute>
              <LayoutWrapper><VaultPage /></LayoutWrapper>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/audits" 
          element={
            <ProtectedRoute>
              <LayoutWrapper><AuditPage /></LayoutWrapper>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <LayoutWrapper><SettingsPage /></LayoutWrapper>
            </ProtectedRoute>
          } 
        />
        
        {/* Default route */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
