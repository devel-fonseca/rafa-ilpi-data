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
import ResidentView from '@/pages/residents/ResidentView'
import ResidentProfile from '@/pages/residents/ResidentProfile'
import ResidentDailyRecordsCalendar from '@/pages/residents/ResidentDailyRecordsCalendar'
import { ResidentPrintView } from '@/pages/residents/ResidentPrintView'

// Daily Records Pages
import DailyRecordsPage from '@/pages/daily-records/DailyRecordsPage'

// Prescriptions Pages
import PrescriptionsPage from '@/pages/prescriptions/PrescriptionsPage'
import PrescriptionsList from '@/pages/prescriptions/PrescriptionsList'
import PrescriptionForm from '@/pages/prescriptions/PrescriptionForm'
import PrescriptionDetails from '@/pages/prescriptions/PrescriptionDetails'

// Medications Pages
import ActiveMedicationsPage from '@/pages/medications/ActiveMedicationsPage'

// Beds Pages
import { BedsStructurePage, BedsMapPage } from '@/pages/beds'

// Institutional Profile Pages
import InstitutionalProfile from '@/pages/institutional-profile/InstitutionalProfile'

// User Profile & Management Pages
import MyProfile from '@/pages/profile/MyProfile'
import UsersList from '@/pages/users/UsersList'

// Placeholder Pages (serão implementados futuramente)
const SettingsPage = () => <div>Configurações</div>

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
        path: 'residentes/:id/view',
        element: <ResidentView />,
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
        path: 'prescricoes/list',
        element: <PrescriptionsList />,
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
        path: 'medicacoes-ativas/:residentId',
        element: <ActiveMedicationsPage />,
      },
      {
        path: 'beds/structure',
        element: <BedsStructurePage />,
      },
      {
        path: 'beds/map',
        element: <BedsMapPage />,
      },
      {
        path: 'perfil-institucional',
        element: <InstitutionalProfile />,
      },
      {
        path: 'meu-perfil',
        element: <MyProfile />,
      },
      {
        path: 'usuarios',
        element: (
          <ProtectedRoute requiredRole="ADMIN">
            <UsersList />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
])
