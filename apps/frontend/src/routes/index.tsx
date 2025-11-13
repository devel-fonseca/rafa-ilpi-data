import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthLayout } from '@/layouts/AuthLayout'
import { DashboardLayout } from '@/layouts/DashboardLayout'

// Placeholder components (serão criados depois)
const LoginPage = () => <div>Login Page</div>
const DashboardPage = () => <div>Dashboard</div>
const ResidentesPage = () => <div>Residentes</div>
const RegistrosDiariosPage = () => <div>Registros Diários</div>

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: <LoginPage />,
      },
    ],
  },
  {
    path: '/dashboard',
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'residentes',
        element: <ResidentesPage />,
      },
      {
        path: 'registros-diarios',
        element: <RegistrosDiariosPage />,
      },
    ],
  },
])
