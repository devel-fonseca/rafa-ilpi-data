import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { SuperAdminLayout } from '@/layouts/SuperAdminLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RequireProfileCompletion } from '@/components/auth/RequireProfileCompletion'
import { PermissionType } from '@/hooks/usePermissions'
import { FeatureGate } from '@/components/features'

// Auth Pages
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import Welcome from '@/pages/auth/Welcome'
import SessionExpired from '@/pages/auth/SessionExpired'
import ForcePasswordChange from '@/pages/auth/ForcePasswordChange'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import ResetPassword from '@/pages/auth/ResetPassword'

// Public Pages
import { PrivacyPolicyPage } from '@/pages/public/PrivacyPolicyPage'

// Dashboard Pages
import Dashboard from '@/pages/Dashboard'
import { ConformidadePage } from '@/pages/dashboards/ConformidadePage'
import { ConformidadeRDCPage } from '@/pages/dashboards/ConformidadeRDCPage'
import { EventosSentinelaPage } from '@/pages/dashboards/EventosSentinelaPage'

// Compliance Assessments Pages
import { AssessmentFormPage } from '@/pages/compliance-assessments/AssessmentFormPage'
import { AssessmentListPage } from '@/pages/compliance-assessments/AssessmentListPage'
import { AssessmentResultPage } from '@/pages/compliance-assessments/AssessmentResultPage'

// Compliance Pages
import DocumentComplianceDashboard from '@/pages/compliance/DocumentComplianceDashboard'
import InstitutionalDocumentManagement from '@/pages/compliance/InstitutionalDocumentManagement'

// Residents Pages
import ResidentsList from '@/pages/residents/ResidentsList'
import ResidentsHub from '@/pages/residents/ResidentsHub'
import ResidentForm from '@/pages/residents/ResidentForm'
import ResidentView from '@/pages/residents/ResidentView'
import ResidentMedicalRecord from '@/pages/residents/ResidentMedicalRecord'
import { ResidentPrintView } from '@/pages/residents/ResidentPrintView'
import { BelongingsPage } from '@/pages/residents/belongings'
import ResidentPanelPage from '@/pages/residents/ResidentPanelPage'

// Daily Records Pages
import { ResidentSelectionPage, ResidentRecordsPage } from '@/pages/daily-records'

// Vital Signs Pages
import { VitalSignsPage } from '@/pages/vital-signs'

// Agenda Pages
import AgendaPage from '@/pages/agenda/AgendaPage'

// Prescriptions Pages
import PrescriptionsPage from '@/pages/prescriptions/PrescriptionsPage'
import PrescriptionsList from '@/pages/prescriptions/PrescriptionsList'
import PrescriptionForm from '@/pages/prescriptions/PrescriptionForm'
import PrescriptionDetails from '@/pages/prescriptions/PrescriptionDetails'
import PrescriptionEdit from '@/pages/prescriptions/PrescriptionEdit'
import PrescriptionsPanelPage from '@/pages/prescriptions/PrescriptionsPanelPage'

// Medications Pages
import ActiveMedicationsPage from '@/pages/medications/ActiveMedicationsPage'

// Beds Pages
import { BedsStructurePage, BedsMapPage } from '@/pages/beds'
import BedsManagementHub from '@/pages/beds-management/BedsManagementHub'

// Institutional Profile Pages
import InstitutionalProfile from '@/pages/institutional-profile/InstitutionalProfile'

// User Profile & Management Pages
import MyProfile from '@/pages/profile/MyProfile'
import UsersList from '@/pages/users/UsersList'
import UserCreatePage from '@/pages/users/UserCreatePage'
import UserEditPage from '@/pages/users/UserEditPage'

// Notifications Pages
import { NotificationsPage } from '@/pages/notifications/NotificationsPage'

// Messages Pages
import MessagesListPage from '@/pages/messages/MessagesListPage'
import ComposeMessagePage from '@/pages/messages/ComposeMessagePage'
import MessageDetailPage from '@/pages/messages/MessageDetailPage'

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
import { PlanDetails } from '@/pages/superadmin/PlanDetails'
import { InvoiceDetails } from '@/pages/superadmin/InvoiceDetails'
import { OverdueDashboard } from '@/pages/superadmin/OverdueDashboard'
import { ContractsList } from '@/pages/superadmin/contracts/ContractsList'
import { ContractDetails } from '@/pages/superadmin/contracts/ContractDetails'
import { ContractNew } from '@/pages/superadmin/contracts/ContractNew'
import { ContractEdit } from '@/pages/superadmin/contracts/ContractEdit'
import { EmailTemplatesList, EmailTemplateEditor, EmailTemplatePreview, EmailTemplateVersions } from '@/pages/superadmin/email-templates'
import EmailLogs from '@/pages/superadmin/EmailLogs'
import TenantMessages from '@/pages/superadmin/TenantMessages'
import TenantMessageForm from '@/pages/superadmin/TenantMessageForm'
import TenantMessageView from '@/pages/superadmin/TenantMessageView'
import { SystemSettings } from '@/pages/superadmin/SystemSettings'

// Settings Pages
import { BillingPage } from '@/pages/settings/BillingPage'
import FinancialOperationsPage from '@/pages/financial/FinancialOperationsPage'

// Onboarding Pages
import { OnboardingWizard } from '@/pages/onboarding/OnboardingWizard'

// Contracts Pages
import ResidentContractsList from '@/pages/contracts/ResidentContractsList'
import ResidentContractUpload from '@/pages/contracts/ResidentContractUpload'
import ResidentContractView from '@/pages/contracts/ResidentContractView'

// Care Shifts Pages
import CareShiftsPage from '@/pages/care-shifts/CareShiftsPage'

// Reports Pages
import ReportsHub from '@/pages/reports/ReportsHub'
import DailyReportPage from '@/pages/reports/DailyReportPage'
import ResidentsListReportPage from '@/pages/reports/ResidentsListReportPage'
import ResidentCareSummaryReportPage from '@/pages/reports/ResidentCareSummaryReportPage'

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
    path: '/force-password-change',
    element: <ForcePasswordChange />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />,
  },
  {
    path: '/reset-password/:token',
    element: <ResetPassword />,
  },
  {
    path: '/privacy-policy',
    element: <PrivacyPolicyPage />,
  },
  {
    path: '/onboarding',
    element: (
      <ProtectedRoute>
        <OnboardingWizard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <RequireProfileCompletion>
          <DashboardLayout />
        </RequireProfileCompletion>
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
        path: 'residentes-hub',
        element: <ResidentsHub />,
      },
      {
        path: 'painel-residente',
        element: <ResidentPanelPage />,
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
        path: 'residentes/:residentId/pertences',
        element: <BelongingsPage />,
      },
      {
        path: 'sinais-vitais/:residentId',
        element: (
          <FeatureGate featureKey="sinais_vitais">
            <VitalSignsPage />
          </FeatureGate>
        ),
      },
      {
        path: 'registros-diarios',
        element: (
          <FeatureGate featureKey="registros_diarios">
            <Outlet />
          </FeatureGate>
        ),
        children: [
          {
            index: true,
            element: <ResidentSelectionPage />,
          },
          {
            path: ':residentId',
            element: <ResidentRecordsPage />,
          },
        ],
      },
      {
        path: 'agenda',
        element: (
          <FeatureGate featureKey="agenda">
            <AgendaPage />
          </FeatureGate>
        ),
      },
      {
        path: 'escala-cuidados',
        element: (
          <FeatureGate featureKey="escalas_plantoes">
            <ProtectedRoute
              requiredPermissions={[PermissionType.VIEW_CARE_SHIFTS]}
            >
              <CareShiftsPage />
            </ProtectedRoute>
          </FeatureGate>
        ),
      },
      {
        path: 'conformidade',
        element: <Outlet />,
        children: [
          {
            index: true,
            element: <ConformidadePage />,
          },
          {
            path: 'documentos',
            element: (
              <FeatureGate featureKey="documentos_institucionais">
                <ProtectedRoute
                  requiredPermissions={[PermissionType.VIEW_INSTITUTIONAL_PROFILE]}
                >
                  <DocumentComplianceDashboard />
                </ProtectedRoute>
              </FeatureGate>
            ),
          },
          {
            path: 'documentos/gestao',
            element: (
              <FeatureGate featureKey="documentos_institucionais">
                <ProtectedRoute
                  requiredPermissions={[PermissionType.VIEW_INSTITUTIONAL_PROFILE]}
                >
                  <InstitutionalDocumentManagement />
                </ProtectedRoute>
              </FeatureGate>
            ),
          },
          {
            path: 'indicadores-mensais',
            element: (
              <ProtectedRoute
                requiredPermissions={[PermissionType.VIEW_COMPLIANCE_DASHBOARD]}
              >
                <ConformidadeRDCPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'eventos-sentinela',
            element: (
              <FeatureGate featureKey="eventos_sentinela">
                <ProtectedRoute
                  requiredPermissions={[PermissionType.VIEW_SENTINEL_EVENTS]}
                >
                  <EventosSentinelaPage />
                </ProtectedRoute>
              </FeatureGate>
            ),
          },
          {
            path: 'autodiagnostico',
            element: (
              <FeatureGate featureKey="autodiagnostico_rdc">
                <ProtectedRoute
                  requiredPermissions={[
                    PermissionType.VIEW_COMPLIANCE_DASHBOARD,
                    PermissionType.MANAGE_COMPLIANCE_ASSESSMENT,
                  ]}
                >
                  <Outlet />
                </ProtectedRoute>
              </FeatureGate>
            ),
            children: [
              {
                index: true,
                element: <AssessmentListPage />,
              },
              {
                path: ':id',
                element: <AssessmentFormPage />,
              },
              {
                path: ':id/result',
                element: <AssessmentResultPage />,
              },
            ],
          },
        ],
      },
      {
        path: 'documentos-institucionais',
        element: (
          <FeatureGate featureKey="documentos_institucionais">
            <Outlet />
          </FeatureGate>
        ),
        children: [
          {
            index: true,
            element: (
              <ProtectedRoute
                requiredPermissions={[PermissionType.VIEW_INSTITUTIONAL_PROFILE]}
              >
                <DocumentComplianceDashboard />
              </ProtectedRoute>
            ),
          },
          {
            path: 'gestao',
            element: (
              <ProtectedRoute
                requiredPermissions={[PermissionType.VIEW_INSTITUTIONAL_PROFILE]}
              >
                <InstitutionalDocumentManagement />
              </ProtectedRoute>
            ),
          },
        ],
      },
      {
        path: 'prescricoes',
        element: (
          <FeatureGate featureKey="medicacoes">
            <Outlet />
          </FeatureGate>
        ),
        children: [
          {
            index: true,
            element: <PrescriptionsPage />,
          },
          {
            path: 'list',
            element: <PrescriptionsList />,
          },
          {
            path: 'new',
            element: <PrescriptionForm />,
          },
          {
            path: 'painel',
            element: <PrescriptionsPanelPage />,
          },
          {
            path: ':id',
            element: <PrescriptionDetails />,
          },
          {
            path: ':id/edit',
            element: <PrescriptionEdit />,
          },
        ],
      },
      {
        path: 'medicacoes-ativas/:residentId',
        element: (
          <FeatureGate featureKey="medicacoes">
            <ActiveMedicationsPage />
          </FeatureGate>
        ),
      },
      {
        path: 'beds/management',
        element: (
          <FeatureGate featureKey="gestao_leitos">
            <BedsManagementHub />
          </FeatureGate>
        ),
      },
      {
        path: 'beds/structure',
        element: (
          <FeatureGate featureKey="quartos">
            <BedsStructurePage />
          </FeatureGate>
        ),
      },
      {
        path: 'beds/map',
        element: (
          <FeatureGate featureKey="mapa_leitos">
            <BedsMapPage />
          </FeatureGate>
        ),
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
        path: 'usuarios/:userId/edit',
        element: (
          <ProtectedRoute requiredRole="ADMIN">
            <UserEditPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'notificacoes',
        element: <NotificationsPage />,
      },
      {
        path: 'mensagens',
        element: (
          <FeatureGate featureKey="mensagens">
            <Outlet />
          </FeatureGate>
        ),
        children: [
          {
            index: true,
            element: <MessagesListPage />,
          },
          {
            path: 'nova',
            element: <ComposeMessagePage />,
          },
          {
            path: ':id',
            element: <MessageDetailPage />,
          },
        ],
      },
      {
        path: 'pops',
        element: (
          <FeatureGate featureKey="pops">
            <Outlet />
          </FeatureGate>
        ),
        children: [
          {
            index: true,
            element: <PopsList />,
          },
          {
            path: 'new',
            element: <PopEditor />,
          },
          {
            path: ':id/edit',
            element: <PopEditor />,
          },
          {
            path: ':id/history',
            element: <PopHistoryPage />,
          },
          {
            path: ':id',
            element: <PopViewer />,
          },
        ],
      },
      {
        path: 'settings/billing',
        element: <BillingPage />,
      },
      {
        path: 'financeiro',
        element: (
          <ProtectedRoute
            requiredPermissions={[PermissionType.VIEW_FINANCIAL_OPERATIONS]}
          >
            <FinancialOperationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'contratos',
        element: (
          <FeatureGate featureKey="contratos">
            <ProtectedRoute
              requiredPermissions={[PermissionType.VIEW_CONTRACTS]}
            >
              <Outlet />
            </ProtectedRoute>
          </FeatureGate>
        ),
        children: [
          {
            index: true,
            element: <ResidentContractsList />,
          },
          {
            path: 'novo',
            element: (
              <ProtectedRoute
                requiredPermissions={[PermissionType.CREATE_CONTRACTS]}
              >
                <ResidentContractUpload />
              </ProtectedRoute>
            ),
          },
          {
            path: ':residentId/:contractId',
            element: <ResidentContractView />,
          },
        ],
      },
      {
        path: 'relatorios',
        element: (
          <ProtectedRoute requiredPermissions={[PermissionType.VIEW_REPORTS]}>
            <Outlet />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <ReportsHub />,
          },
          {
            path: 'diario',
            element: <DailyReportPage />,
          },
          {
            path: 'residentes',
            element: <ResidentsListReportPage />,
          },
          {
            path: 'resumo-assistencial',
            element: <ResidentCareSummaryReportPage />,
          },
        ],
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
        path: 'overdue',
        element: <OverdueDashboard />,
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
        path: 'plans/:id',
        element: <PlanDetails />,
      },
      {
        path: 'terms',
        element: <ContractsList />,
      },
      {
        path: 'terms/new',
        element: <ContractNew />,
      },
      {
        path: 'terms/:id/edit',
        element: <ContractEdit />,
      },
      {
        path: 'terms/:id',
        element: <ContractDetails />,
      },
      {
        path: 'email-templates',
        element: <EmailTemplatesList />,
      },
      {
        path: 'email-templates/:id/edit',
        element: <EmailTemplateEditor />,
      },
      {
        path: 'email-templates/:id/preview',
        element: <EmailTemplatePreview />,
      },
      {
        path: 'email-templates/:id/versions',
        element: <EmailTemplateVersions />,
      },
      {
        path: 'email-logs',
        element: <EmailLogs />,
      },
      {
        path: 'tenant-messages',
        element: <TenantMessages />,
      },
      {
        path: 'tenant-messages/new',
        element: <TenantMessageForm />,
      },
      {
        path: 'tenant-messages/:id',
        element: <TenantMessageView />,
      },
      {
        path: 'tenant-messages/:id/edit',
        element: <TenantMessageForm />,
      },
      {
        path: 'settings',
        element: <SystemSettings />,
      },
    ],
  },
])
