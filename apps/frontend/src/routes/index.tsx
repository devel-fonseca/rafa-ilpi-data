import { createBrowserRouter, Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { SuperAdminLayout } from '@/layouts/SuperAdminLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

// Auth Pages
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import Welcome from '@/pages/auth/Welcome'
import SessionExpired from '@/pages/auth/SessionExpired'

// Dashboard Pages
import Dashboard from '@/pages/Dashboard'

// Residents Pages
import ResidentsList from '@/pages/residents/ResidentsList'
import ResidentForm from '@/pages/residents/ResidentForm'
import ResidentView from '@/pages/residents/ResidentView'
import ResidentMedicalRecord from '@/pages/residents/ResidentMedicalRecord'
import ResidentDailyRecordsCalendar from '@/pages/residents/ResidentDailyRecordsCalendar'
import ResidentMedicationsCalendar from '@/pages/residents/ResidentMedicationsCalendar'
import { ResidentPrintView } from '@/pages/residents/ResidentPrintView'

// Daily Records Pages
import DailyRecordsPage from '@/pages/daily-records/DailyRecordsPage'

// Prescriptions Pages
import PrescriptionsPage from '@/pages/prescriptions/PrescriptionsPage'
import PrescriptionsList from '@/pages/prescriptions/PrescriptionsList'
import PrescriptionForm from '@/pages/prescriptions/PrescriptionForm'
import PrescriptionDetails from '@/pages/prescriptions/PrescriptionDetails'
import PrescriptionEdit from '@/pages/prescriptions/PrescriptionEdit'

// Medications Pages
import ActiveMedicationsPage from '@/pages/medications/ActiveMedicationsPage'

// Beds Pages
import { BedsStructurePage, BedsMapPage } from '@/pages/beds'

// Institutional Profile Pages
import InstitutionalProfile from '@/pages/institutional-profile/InstitutionalProfile'

// User Profile & Management Pages
import MyProfile from '@/pages/profile/MyProfile'
import UsersList from '@/pages/users/UsersList'
import UserCreatePage from '@/pages/users/UserCreatePage'

// Notifications Pages
import { NotificationsPage } from '@/pages/notifications/NotificationsPage'

// POPs Pages
import PopsList from '@/pages/pops/PopsList'
import PopEditor from '@/pages/pops/PopEditor'
import PopViewer from '@/pages/pops/PopViewer'
import PopHistoryPage from '@/pages/pops/PopHistoryPage'

// SuperAdmin Pages
import { SuperAdminDashboard } from '@/pages/superadmin/Dashboard'
import { TenantsList } from '@/pages/superadmin/TenantsList'
import { TenantDetails } from '@/pages/superadmin/TenantDetails'
import { InvoicesList } from '@/pages/superadmin/InvoicesList'
import { FinancialAnalytics } from '@/pages/superadmin/FinancialAnalytics'
import { AlertCenter } from '@/pages/superadmin/AlertCenter'
import { PlansList } from '@/pages/superadmin/PlansList'
import { InvoiceDetails } from '@/pages/superadmin/InvoiceDetails'
import { ContractsList } from '@/pages/superadmin/contracts/ContractsList'
import { ContractDetails } from '@/pages/superadmin/contracts/ContractDetails'
import { ContractNew } from '@/pages/superadmin/contracts/ContractNew'
import { ContractEdit } from '@/pages/superadmin/contracts/ContractEdit'

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
    path: '/session-expired',
    element: <SessionExpired />,
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
        element: <ResidentMedicalRecord />,
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
        path: 'residentes/:id/medicacoes-calendario',
        element: <ResidentMedicationsCalendar />,
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
        element: <PrescriptionEdit />,
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
        path: 'usuarios/new',
        element: (
          <ProtectedRoute requiredRole="ADMIN">
            <UserCreatePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'notificacoes',
        element: <NotificationsPage />,
      },
      {
        path: 'pops',
        element: <PopsList />,
      },
      {
        path: 'pops/new',
        element: <PopEditor />,
      },
      {
        path: 'pops/:id/edit',
        element: <PopEditor />,
      },
      {
        path: 'pops/:id/history',
        element: <PopHistoryPage />,
      },
      {
        path: 'pops/:id',
        element: <PopViewer />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: '/superadmin',
    element: (
      <ProtectedRoute requiredRole="SUPERADMIN">
        <SuperAdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <SuperAdminDashboard />,
      },
      {
        path: 'tenants',
        element: <TenantsList />,
      },
      {
        path: 'tenants/:id',
        element: <TenantDetails />,
      },
      {
        path: 'invoices',
        element: <InvoicesList />,
      },
      {
        path: 'invoices/:id',
        element: <InvoiceDetails />,
      },
      {
        path: 'analytics',
        element: <FinancialAnalytics />,
      },
      {
        path: 'alerts',
        element: <AlertCenter />,
      },
      {
        path: 'plans',
        element: <PlansList />,
      },
      {
        path: 'contracts',
        element: <ContractsList />,
      },
      {
        path: 'contracts/new',
        element: <ContractNew />,
      },
      {
        path: 'contracts/:id/edit',
        element: <ContractEdit />,
      },
      {
        path: 'contracts/:id',
        element: <ContractDetails />,
      },
    ],
  },
])
