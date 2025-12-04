import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function SessionExpired() {
  const navigate = useNavigate()

  useEffect(() => {
    // Limpar qualquer dado de autenticação residual
    localStorage.removeItem('rafa-ilpi-auth')
  }, [])

  const handleLogin = () => {
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="pt-12 pb-8 px-8">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Logo */}
            <div className="flex items-center justify-center">
              <img
                src="/Logo_RafaLABS.png"
                alt="Rafa LABS"
                className="h-24 w-auto"
              />
            </div>

            {/* Mensagem */}
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">
                Sessão Expirada
              </h1>
              <p className="text-muted-foreground">
                Sua sessão expirou. Por favor, identifique-se novamente.
              </p>
            </div>

            {/* Botão de Login */}
            <Button
              onClick={handleLogin}
              className="w-full"
              size="lg"
            >
              Fazer Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
