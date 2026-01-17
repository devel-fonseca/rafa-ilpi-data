import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { changePassword } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Loader2, Shield, AlertCircle } from 'lucide-react'

export default function ForcePasswordChange() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validações
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('Preencha todos os campos')
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('A nova senha e a confirmação devem ser iguais')
      return
    }

    if (formData.newPassword.length < 8) {
      setError('A nova senha deve ter no mínimo 8 caracteres')
      return
    }

    // Validar complexidade da senha
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
    if (!passwordRegex.test(formData.newPassword)) {
      setError('A senha deve conter pelo menos 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial')
      return
    }

    if (!user) {
      setError('Usuário não autenticado')
      return
    }

    try {
      setIsLoading(true)

      await changePassword(user.id, {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      })

      // Senha alterada com sucesso - redirecionar para dashboard
      if (user.role === 'SUPERADMIN') {
        navigate('/superadmin')
      } else {
        navigate('/dashboard')
      }
    } catch (err: unknown) {
      console.error('Erro ao alterar senha:', err)
      const errorResponse = (err as { response?: { data?: { message?: string } } }).response
      const errorMessage = errorResponse?.data?.message || 'Erro ao alterar senha. Verifique se a senha atual está correta.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mx-auto">
            <Shield className="w-6 h-6 text-amber-600" />
          </div>
          <CardTitle className="text-center text-2xl">Troca de Senha Obrigatória</CardTitle>
          <CardDescription className="text-center">
            Por segurança, você precisa alterar sua senha temporária antes de acessar o sistema.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha Temporária Atual</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder="Digite a senha que você recebeu"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  name="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Digite sua nova senha"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80"
                  tabIndex={-1}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres com maiúscula, minúscula, número e caractere especial
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Digite novamente sua nova senha"
                  disabled={isLoading}
                  required
                  className={
                    formData.confirmPassword &&
                    formData.newPassword &&
                    formData.confirmPassword.length >= formData.newPassword.length &&
                    formData.confirmPassword !== formData.newPassword
                      ? 'border-danger focus-visible:ring-red-500'
                      : ''
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {formData.confirmPassword &&
               formData.newPassword &&
               formData.confirmPassword.length >= formData.newPassword.length &&
               formData.confirmPassword !== formData.newPassword && (
                <p className="text-xs text-danger">
                  As senhas não conferem
                </p>
              )}
              {formData.confirmPassword &&
               formData.newPassword &&
               formData.confirmPassword === formData.newPassword && (
                <p className="text-xs text-success">
                  ✓ As senhas conferem
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleLogout}
                disabled={isLoading}
                className="flex-1"
              >
                Sair
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Alterar Senha
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
