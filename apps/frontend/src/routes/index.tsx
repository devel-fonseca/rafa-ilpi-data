import { Suspense, lazy, type ReactNode } from 'react'
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

// Compliance Assessments Pages
import { AssessmentFormPage } from '@/pages/compliance-assessments/AssessmentFormPage'
import { AssessmentListPage } from '@/pages/compliance-assessments/AssessmentListPage'
import { AssessmentResultPage } from '@/pages/compliance-assessments/AssessmentResultPage'

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

// Agenda Pages
import AgendaPage from '@/pages/agenda/AgendaPage'

// Prescriptions Pages
import PrescriptionsPage from '@/pages/prescriptions/PrescriptionsPage'
import PrescriptionsList from '@/pages/prescriptions/PrescriptionsList'
import PrescriptionForm from '@/pages/prescriptions/PrescriptionForm'
import PrescriptionDetails from '@/pages/prescriptions/PrescriptionDetails'
import PrescriptionEdit from '@/pages/prescriptions/PrescriptionEdit'
import PrescriptionsPanelPage from '@/pages/prescriptions/PrescriptionsPanelPage'
import MedicationAdminPage from '@/pages/prescriptions/MedicationAdminPage'

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

// Settings Pages
import { BillingPage } from '@/pages/settings/BillingPage'
import FinancialOperationsPage from '@/pages/financial/FinancialOperationsPage'

// Onboarding Pages
import { OnboardingWizard } from '@/pages/onboarding/OnboardingWizard'

// Contracts Pages
import ResidentContractsList from '@/pages/contracts/ResidentContractsList'
import ResidentContractUpload from '@/pages/contracts/ResidentContractUpload'
import ResidentContractView from '@/pages/contracts/ResidentContractView'
import ResidentContractEdit from '@/pages/contracts/ResidentContractEdit'

// Care Shifts Pages
import CareShiftsPage from '@/pages/care-shifts/CareShiftsPage'

// Reports Pages

const routeLoaderFallback = (
  <div className="flex items-center justify-center h-48 text-muted-foreground">
    Carregando...
  </div>
)

const withSuspense = (element: ReactNode) => (
  <Suspense fallback={routeLoaderFallback}>{element}</Suspense>
)

const ConformidadePage = lazy(() =>
  import('@/pages/dashboards/ConformidadePage').then((m) => ({ default: m.ConformidadePage })),
)
const ConformidadeRDCPage = lazy(() =>
  import('@/pages/dashboards/ConformidadeRDCPage').then((m) => ({ default: m.ConformidadeRDCPage })),
)
const EventosSentinelaPage = lazy(() =>
  import('@/pages/dashboards/EventosSentinelaPage').then((m) => ({ default: m.EventosSentinelaPage })),
)
const DocumentComplianceDashboard = lazy(() => import('@/pages/compliance/DocumentComplianceDashboard'))
const InstitutionalDocumentManagement = lazy(() => import('@/pages/compliance/InstitutionalDocumentManagement'))
const VitalSignsPage = lazy(() =>
  import('@/pages/vital-signs').then((m) => ({ default: m.VitalSignsPage })),
)

const ReportsHub = lazy(() => import('@/pages/reports/ReportsHub'))
const DailyReportPage = lazy(() => import('@/pages/reports/DailyReportPage'))
const ResidentsListReportPage = lazy(() => import('@/pages/reports/ResidentsListReportPage'))
const ResidentCareSummaryReportPage = lazy(() => import('@/pages/reports/ResidentCareSummaryReportPage'))
const ShiftHistoryReportPage = lazy(() => import('@/pages/reports/ShiftHistoryReportPage'))

const SuperAdminDashboard = lazy(() =>
  import('@/pages/superadmin/Dashboard').then((m) => ({ default: m.SuperAdminDashboard })),
)
const TenantsList = lazy(() =>
  import('@/pages/superadmin/TenantsList').then((m) => ({ default: m.TenantsList })),
)
const TenantDetails = lazy(() =>
  import('@/pages/superadmin/TenantDetails').then((m) => ({ default: m.TenantDetails })),
)
const InvoicesList = lazy(() =>
  import('@/pages/superadmin/InvoicesList').then((m) => ({ default: m.InvoicesList })),
)
const FinancialAnalytics = lazy(() =>
  import('@/pages/superadmin/FinancialAnalytics').then((m) => ({ default: m.FinancialAnalytics })),
)
const AlertCenter = lazy(() =>
  import('@/pages/superadmin/AlertCenter').then((m) => ({ default: m.AlertCenter })),
)
const PlansList = lazy(() =>
  import('@/pages/superadmin/PlansList').then((m) => ({ default: m.PlansList })),
)
const PlanDetails = lazy(() =>
  import('@/pages/superadmin/PlanDetails').then((m) => ({ default: m.PlanDetails })),
)
const InvoiceDetails = lazy(() =>
  import('@/pages/superadmin/InvoiceDetails').then((m) => ({ default: m.InvoiceDetails })),
)
const OverdueDashboard = lazy(() =>
  import('@/pages/superadmin/OverdueDashboard').then((m) => ({ default: m.OverdueDashboard })),
)
const BackupsPage = lazy(() =>
  import('@/pages/superadmin/BackupsPage').then((m) => ({ default: m.BackupsPage })),
)
const ContractsList = lazy(() =>
  import('@/pages/superadmin/contracts/ContractsList').then((m) => ({ default: m.ContractsList })),
)
const ContractDetails = lazy(() =>
  import('@/pages/superadmin/contracts/ContractDetails').then((m) => ({ default: m.ContractDetails })),
)
const ContractNew = lazy(() =>
  import('@/pages/superadmin/contracts/ContractNew').then((m) => ({ default: m.ContractNew })),
)
const ContractEdit = lazy(() =>
  import('@/pages/superadmin/contracts/ContractEdit').then((m) => ({ default: m.ContractEdit })),
)
const EmailTemplatesList = lazy(() =>
  import('@/pages/superadmin/email-templates').then((m) => ({ default: m.EmailTemplatesList })),
)
const EmailTemplateEditor = lazy(() =>
  import('@/pages/superadmin/email-templates').then((m) => ({ default: m.EmailTemplateEditor })),
)
const EmailTemplatePreview = lazy(() =>
  import('@/pages/superadmin/email-templates').then((m) => ({ default: m.EmailTemplatePreview })),
)
const EmailTemplateVersions = lazy(() =>
  import('@/pages/superadmin/email-templates').then((m) => ({ default: m.EmailTemplateVersions })),
)
const EmailLogs = lazy(() => import('@/pages/superadmin/EmailLogs'))
const TenantMessages = lazy(() => import('@/pages/superadmin/TenantMessages'))
const TenantMessageForm = lazy(() => import('@/pages/superadmin/TenantMessageForm'))
const TenantMessageView = lazy(() => import('@/pages/superadmin/TenantMessageView'))
const SystemSettings = lazy(() =>
  import('@/pages/superadmin/SystemSettings').then((m) => ({ default: m.SystemSettings })),
)

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
                {withSuspense(<VitalSignsPage />)}
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
            element: withSuspense(<ConformidadePage />),
          },
          {
            path: 'documentos',
            element: (
              <FeatureGate featureKey="documentos_institucionais">
                <ProtectedRoute
                  requiredPermissions={[PermissionType.VIEW_INSTITUTIONAL_PROFILE]}
                >
                  {withSuspense(<DocumentComplianceDashboard />)}
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
                  {withSuspense(<InstitutionalDocumentManagement />)}
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
                {withSuspense(<ConformidadeRDCPage />)}
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
                  {withSuspense(<EventosSentinelaPage />)}
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
                {withSuspense(<DocumentComplianceDashboard />)}
              </ProtectedRoute>
            ),
          },
          {
            path: 'gestao',
            element: (
              <ProtectedRoute
                requiredPermissions={[PermissionType.VIEW_INSTITUTIONAL_PROFILE]}
              >
                {withSuspense(<InstitutionalDocumentManagement />)}
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
            path: 'administracao',
            element: <MedicationAdminPage />,
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
          <FeatureGate featureKey="financeiro_operacional">
            <ProtectedRoute
              requiredPermissions={[PermissionType.VIEW_FINANCIAL_OPERATIONS]}
            >
              <FinancialOperationsPage />
            </ProtectedRoute>
          </FeatureGate>
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
          {
            path: ':residentId/:contractId/editar',
            element: (
              <ProtectedRoute
                requiredPermissions={[PermissionType.UPDATE_CONTRACTS]}
              >
                <ResidentContractEdit />
              </ProtectedRoute>
            ),
          },
        ],
      },
      {
        path: 'relatorios',
        element: (
          <FeatureGate featureKey="relatorios">
            <ProtectedRoute requiredPermissions={[PermissionType.VIEW_REPORTS]}>
              <Outlet />
            </ProtectedRoute>
          </FeatureGate>
        ),
        children: [
          {
            index: true,
            element: withSuspense(<ReportsHub />),
          },
          {
            path: 'diario',
            element: withSuspense(<DailyReportPage />),
          },
          {
            path: 'residentes',
            element: withSuspense(<ResidentsListReportPage />),
          },
          {
            path: 'resumo-assistencial',
            element: withSuspense(<ResidentCareSummaryReportPage />),
          },
          {
            path: 'historico-plantao/:shiftId',
            element: withSuspense(<ShiftHistoryReportPage />),
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
        element: withSuspense(<SuperAdminDashboard />),
      },
      {
        path: 'tenants',
        element: withSuspense(<TenantsList />),
      },
      {
        path: 'tenants/:id',
        element: withSuspense(<TenantDetails />),
      },
      {
        path: 'invoices',
        element: withSuspense(<InvoicesList />),
      },
      {
        path: 'invoices/:id',
        element: withSuspense(<InvoiceDetails />),
      },
      {
        path: 'analytics',
        element: withSuspense(<FinancialAnalytics />),
      },
      {
        path: 'overdue',
        element: withSuspense(<OverdueDashboard />),
      },
      {
        path: 'backups',
        element: withSuspense(<BackupsPage />),
      },
      {
        path: 'alerts',
        element: withSuspense(<AlertCenter />),
      },
      {
        path: 'plans',
        element: withSuspense(<PlansList />),
      },
      {
        path: 'plans/:id',
        element: withSuspense(<PlanDetails />),
      },
      {
        path: 'terms',
        element: withSuspense(<ContractsList />),
      },
      {
        path: 'terms/new',
        element: withSuspense(<ContractNew />),
      },
      {
        path: 'terms/:id/edit',
        element: withSuspense(<ContractEdit />),
      },
      {
        path: 'terms/:id',
        element: withSuspense(<ContractDetails />),
      },
      {
        path: 'email-templates',
        element: withSuspense(<EmailTemplatesList />),
      },
      {
        path: 'email-templates/:id/edit',
        element: withSuspense(<EmailTemplateEditor />),
      },
      {
        path: 'email-templates/:id/preview',
        element: withSuspense(<EmailTemplatePreview />),
      },
      {
        path: 'email-templates/:id/versions',
        element: withSuspense(<EmailTemplateVersions />),
      },
      {
        path: 'email-logs',
        element: withSuspense(<EmailLogs />),
      },
      {
        path: 'tenant-messages',
        element: withSuspense(<TenantMessages />),
      },
      {
        path: 'tenant-messages/new',
        element: withSuspense(<TenantMessageForm />),
      },
      {
        path: 'tenant-messages/:id',
        element: withSuspense(<TenantMessageView />),
      },
      {
        path: 'tenant-messages/:id/edit',
        element: withSuspense(<TenantMessageForm />),
      },
      {
        path: 'settings',
        element: withSuspense(<SystemSettings />),
      },
    ],
  },
])
