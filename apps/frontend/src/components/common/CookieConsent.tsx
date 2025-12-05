import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Cookie } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Banner de Consentimento de Cookies e LGPD
 *
 * Exibe aviso sobre cookies e armazenamento local na primeira visita DE CADA USUÁRIO.
 * Armazena preferência por usuário no localStorage (chave única por user.id).
 */
export function CookieConsent() {
  const user = useAuthStore((state) => state.user)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Se não há usuário logado, não mostrar banner
    if (!user?.id) {
      setShowBanner(false)
      return
    }

    // Chave única por usuário
    const consentKey = `rafa-cookie-consent-${user.id}`
    const consent = localStorage.getItem(consentKey)

    // Se não existe consentimento para este usuário, mostrar banner após 1 segundo
    if (!consent) {
      const timer = setTimeout(() => {
        setShowBanner(true)
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [user?.id])

  const handleAccept = () => {
    if (!user?.id) return

    // Armazenar consentimento com chave única por usuário
    const consentKey = `rafa-cookie-consent-${user.id}`
    const dateKey = `rafa-cookie-consent-date-${user.id}`

    localStorage.setItem(consentKey, 'accepted')
    localStorage.setItem(dateKey, new Date().toISOString())
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white dark:bg-card border-t-2 border-primary shadow-lg animate-in slide-in-from-bottom duration-500">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start gap-4">
          {/* Ícone */}
          <div className="flex-shrink-0 mt-1">
            <Cookie className="h-6 w-6 text-primary" />
          </div>

          {/* Conteúdo */}
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-lg">Aviso sobre Cookies e Armazenamento Local</h3>
            <p className="text-sm text-muted-foreground">
              Este sistema utiliza <strong>cookies essenciais</strong> e <strong>armazenamento local</strong> para:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
              <li>Manter sua sessão de login ativa e segura (token JWT)</li>
              <li>Armazenar suas preferências de interface</li>
              <li>Melhorar a performance com cache de dados</li>
              <li>Garantir o funcionamento correto do sistema</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              <strong>LGPD:</strong> Não coletamos dados pessoais através de cookies de terceiros.
              Os dados são armazenados apenas localmente no seu navegador.
              <strong> Ao continuar usando o sistema, você concorda com o uso desses recursos essenciais.</strong>
            </p>
          </div>

          {/* Botão */}
          <div className="flex-shrink-0">
            <Button
              onClick={handleAccept}
              size="sm"
              className="whitespace-nowrap"
            >
              Entendi
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
