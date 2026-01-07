import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, Mail, Lock, ArrowRight, Users, FileText, Activity } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Alert, AlertDescription } from '../../components/ui/alert'

interface WelcomeState {
  adminEmail: string
  tenantName: string
}

export default function Welcome() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as WelcomeState

  useEffect(() => {
    // Se não houver state, redirecionar para login
    if (!state?.adminEmail || !state?.tenantName) {
      navigate('/login', { replace: true })
    }
  }, [state, navigate])

  const handleGoToLogin = () => {
    // Limpar qualquer dado residual e ir para login
    sessionStorage.clear()
    localStorage.removeItem('registration-data')
    navigate('/login', { replace: true })
  }

  if (!state) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        <Card>
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-success/10 rounded-full p-3">
                <CheckCircle className="w-12 h-12 text-success" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl">Cadastro Realizado com Sucesso!</CardTitle>
              <CardDescription className="mt-2">
                Bem-vindo ao Sistema Rafa ILPI
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Sua instituição <span className="font-semibold text-foreground">{state.tenantName}</span> foi cadastrada com sucesso.
              </p>
              <p className="text-sm text-muted-foreground">
                Agora você já pode acessar o sistema usando as credenciais abaixo.
              </p>
            </div>

            {/* Informações de Acesso */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">E-mail</p>
                  <p className="text-sm font-medium text-foreground truncate">{state.adminEmail}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Senha</p>
                  <p className="text-sm text-foreground">A senha que você definiu no cadastro</p>
                </div>
              </div>
            </div>

            {/* Próximos Passos */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Próximos Passos:</h3>

              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <div className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="text-muted-foreground">
                    Faça login com o e-mail e a senha acima
                  </p>
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <div className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="text-muted-foreground">
                    Complete o perfil da sua ILPI
                  </p>
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <div className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <p className="text-muted-foreground">
                    Cadastre os primeiros usuários da equipe
                  </p>
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <div className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                    4
                  </div>
                  <p className="text-muted-foreground">
                    Comece a registrar residentes e dados clínicos
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleGoToLogin}
              className="w-full"
              size="lg"
            >
              Acessar o Sistema
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>

          <CardFooter className="flex-col gap-3 text-center">
            <p className="text-xs text-muted-foreground">
              Precisa de ajuda?{' '}
              <a
                href="mailto:suporte@rafalabs.com.br"
                className="text-primary hover:underline font-medium"
              >
                suporte@rafalabs.com.br
              </a>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
