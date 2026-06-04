// client/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Appointments from './pages/Appointments'
import Invoices from './pages/Invoices'
import SessionNotes from './pages/SessionNotes'
import { AuthProvider, useAuth } from './context/AuthContext'
import ClientDetail from './pages/Clientdetail'
import AppointmentDetail from './pages/Appointmentdetail'
import InvoiceDetail from './pages/InvoiceDetail'
import TwoFactorSetup from './pages/TwoFactorSetup'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  return session ? <>{children}</> : <Navigate to="/login" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/"         element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/clients"  element={<ProtectedRoute><Clients /></ProtectedRoute>} />
      <Route path="/clients/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
      <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
      <Route path="/appointments/:id" element={<ProtectedRoute><AppointmentDetail /></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
      <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceDetail /></ProtectedRoute>} />
      <Route path="/session-notes" element={<ProtectedRoute><SessionNotes /></ProtectedRoute>} />
      <Route path="/session-notes/:appointmentId" element={<ProtectedRoute><SessionNotes /></ProtectedRoute>} />
      <Route path="/account/2fa" element={<ProtectedRoute><TwoFactorSetup /></ProtectedRoute>} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}