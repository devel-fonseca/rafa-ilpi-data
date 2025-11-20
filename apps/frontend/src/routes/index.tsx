import { createBrowserRouter, Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

// Auth Pages
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import Welcome from '@/pages/auth/Welcome'

// Dashboard Pages
import Dashboard from '@/pages/Dashboard'

// Residents Pages
import ResidentsList from '@/pages/residents/ResidentsList'
import ResidentForm from '@/pages/residents/ResidentForm'
import ResidentProfile from '@/pages/residents/ResidentProfile'
import ResidentDailyRecordsCalendar from '@/pages/residents/ResidentDailyRecordsCalendar'
import { ResidentPrintView } from '@/pages/residents/ResidentPrintView'

// Daily Records Pages
import DailyRecordsPage from '@/pages/daily-records/DailyRecordsPage'

// Prescriptions Pages
import PrescriptionsPage from '@/pages/prescriptions/PrescriptionsPage'
import PrescriptionForm from '@/pages/prescriptions/PrescriptionForm'
import PrescriptionDetails from '@/pages/prescriptions/PrescriptionDetails'

// Placeholder Pages (serão implementados futuramente)
const SettingsPage = () => <div>Configurações</div>
const UsersPage = () => <div>Usuários</div>

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/welcome',
    element: <Welcome />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'residentes',
        element: <ResidentsList />,
      },
      {
        path: 'residentes/new',
        element: <ResidentForm />,
      },
      {
        path: 'residentes/:id',
        element: <ResidentProfile />,
      },
      {
        path: 'residentes/:id/edit',
        element: <ResidentForm />,
      },
      {
        path: 'residentes/:id/print',
        element: <ResidentPrintView />,
      },
      {
        path: 'residentes/:id/registros-calendario',
        element: <ResidentDailyRecordsCalendar />,
      },
      {
        path: 'registros-diarios',
        element: <DailyRecordsPage />,
      },
      {
        path: 'prescricoes',
        element: <PrescriptionsPage />,
      },
      {
        path: 'prescricoes/new',
        element: <PrescriptionForm />,
      },
      {
        path: 'prescricoes/:id',
        element: <PrescriptionDetails />,
      },
      {
        path: 'prescricoes/:id/edit',
        element: <PrescriptionForm />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute requiredRole="ADMIN">
            <UsersPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
])
