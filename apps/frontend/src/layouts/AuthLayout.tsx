import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Rafa ILPI</h1>
          <p className="text-slate-600 mt-2">Sistema de Gestão para ILPIs</p>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
