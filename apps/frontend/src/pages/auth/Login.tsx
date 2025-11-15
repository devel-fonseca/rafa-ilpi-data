import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Eye, EyeOff, Loader2, Building2, Users } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group'

export default function Login() {
  const navigate = useNavigate()
  const { login, selectTenant, isLoading, error, clearError, availableTenants, isAuthenticated } = useAuthStore()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [showTenantSelection, setShowTenantSelection] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    clearError()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    try {
      const result = await login(formData.email, formData.password)

      if (result?.requiresTenantSelection) {
        setShowTenantSelection(true)
        setSelectedTenantId(result.tenants[0].id) // Selecionar primeiro por padrão
      }
      // Removendo a navegação manual - o useEffect irá redirecionar quando isAuthenticated mudar
    } catch (err) {
      console.error('Erro no login:', err)
      // Erro já tratado no store
    }
  }

  const handleTenantSelection = async () => {
    if (!selectedTenantId) {
      return
    }

    try {
      await selectTenant(selectedTenantId, formData.email, formData.password)
      // Removendo a navegação manual - o useEffect irá redirecionar quando isAuthenticated mudar
    } catch (err) {
      console.error('Erro ao selecionar tenant:', err)
      // Erro já tratado no store
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  // Tela de seleção de tenant
  if (showTenantSelection && availableTenants) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              Selecione a ILPI
            </CardTitle>
            <CardDescription>
              Você tem acesso a múltiplas ILPIs. Selecione qual deseja acessar:
            </CardDescription>
          </CardHeader>

          <CardContent>
            <RadioGroup value={selectedTenantId} onValueChange={setSelectedTenantId}>
              <div className="space-y-3">
                {availableTenants.map((tenant) => (
                  <div key={tenant.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value={tenant.id} id={tenant.id} className="mt-1" />
                    <Label htmlFor={tenant.id} className="cursor-pointer flex-1">
                      <div className="font-medium">{tenant.name}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {tenant.role === 'ADMIN' ? 'Administrador' :
                           tenant.role === 'MANAGER' ? 'Gerente' : 'Usuário'}
                        </span>
                        <span className="mx-2">•</span>
                        <span>Plano {tenant.plan}</span>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowTenantSelection(false)
                setFormData({ email: '', password: '' })
                clearError()
              }}
              className="flex-1"
            >
              Voltar
            </Button>
            <Button
              onClick={handleTenantSelection}
              disabled={!selectedTenantId || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Acessando...
                </>
              ) : (
                'Acessar'
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Tela de login principal
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Rafa ILPI
          </CardTitle>
          <CardDescription className="text-center">
            Sistema de Gestão para ILPIs
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-3">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>

            <div className="text-sm text-center text-gray-600">
              Primeira vez?{' '}
              <Link
                to="/register"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Cadastre sua ILPI
              </Link>
            </div>

            <div className="text-xs text-center text-gray-500 pt-2 border-t w-full">
              <Link
                to="/forgot-password"
                className="hover:text-gray-700"
              >
                Esqueceu sua senha?
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}