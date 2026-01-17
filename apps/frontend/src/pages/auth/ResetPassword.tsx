import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { api } from '@/services/api'

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState(true)

  // Regex de validação de senha (mesma do backend)
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/

  const validatePassword = (password: string): boolean => {
    return password.length >= 8 && passwordRegex.test(password)
  }

  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0

  useEffect(() => {
    // Verificar se token existe
    if (!token) {
      setTokenValid(false)
      toast({
        variant: 'destructive',
        title: 'Token inválido',
        description: 'O link de recuperação é inválido ou expirou.',
      })
    }
  }, [token, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validatePassword(newPassword)) {
      toast({
        variant: 'destructive',
        title: 'Senha inválida',
        description:
          'A senha deve ter no mínimo 8 caracteres, incluindo maiúscula, minúscula, número e caractere especial.',
      })
      return
    }

    if (!passwordsMatch) {
      toast({
        variant: 'destructive',
        title: 'Senhas não coincidem',
        description: 'As senhas digitadas não são iguais.',
      })
      return
    }

    setIsLoading(true)

    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword,
      })

      setSuccess(true)
      toast({
        title: 'Senha alterada',
        description: 'Sua senha foi redefinida com sucesso!',
      })

      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (error: unknown) {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Ocorreu um erro ao redefinir sua senha.'

      toast({
        variant: 'destructive',
        title: 'Erro ao redefinir senha',
        description: message,
      })

      // Se token inválido/expirado, marcar como inválido
      if (message.includes('inválido') || message.includes('expirado')) {
        setTokenValid(false)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!tokenValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10">
              <AlertCircle className="h-6 w-6 text-danger" />
            </div>
            <CardTitle>Link Inválido</CardTitle>
            <CardDescription>
              Este link de recuperação é inválido ou expirou
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Links de recuperação expiram em 1 hora por segurança.
              Solicite um novo link de recuperação.
            </p>
            <div className="pt-4 space-y-2">
              <Button asChild className="w-full">
                <Link to="/forgot-password">
                  Solicitar Novo Link
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">
                  Voltar para o Login
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <CardTitle>Senha Redefinida</CardTitle>
            <CardDescription>
              Sua senha foi alterada com sucesso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Você será redirecionado para a página de login em instantes...
            </p>
            <Button asChild className="w-full">
              <Link to="/login">
                Ir para o Login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Redefinir Senha</CardTitle>
          <CardDescription>
            Escolha uma nova senha forte para sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nova Senha */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  className="pl-9 pr-9"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newPassword && !validatePassword(newPassword) && (
                <p className="text-xs text-danger">
                  Mínimo 8 caracteres com maiúscula, minúscula, número e caractere especial (@$!%*?&)
                </p>
              )}
              {newPassword && validatePassword(newPassword) && (
                <p className="text-xs text-success flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Senha forte
                </p>
              )}
            </div>

            {/* Confirmar Senha */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="pl-9 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-danger">
                  As senhas não coincidem
                </p>
              )}
              {confirmPassword && passwordsMatch && (
                <p className="text-xs text-success flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Senhas coincidem
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !validatePassword(newPassword) || !passwordsMatch}
            >
              {isLoading ? 'Redefinindo...' : 'Redefinir Senha'}
            </Button>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Voltar para o login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
