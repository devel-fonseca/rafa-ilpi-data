import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Cookie, ExternalLink } from 'lucide-react'
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
          <div className="flex-1 space-y-3">
            <h3 className="font-semibold text-lg">Aviso sobre Cookies e Armazenamento Local</h3>

            <p className="text-sm text-muted-foreground">
              Este sistema utiliza <strong>cookies e armazenamento local estritamente necessários</strong> para o seu funcionamento, incluindo:
            </p>

            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
              <li>Manter sua sessão de login ativa e segura</li>
              <li>Armazenar preferências básicas de interface</li>
              <li>Garantir a performance e estabilidade do sistema</li>
              <li>Assegurar o correto funcionamento das funcionalidades essenciais</li>
            </ul>

            <div className="text-sm text-muted-foreground space-y-2 mt-3 pt-2 border-t">
              <p className="font-semibold">🔒 Privacidade e LGPD</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Não utilizamos cookies de terceiros</li>
                <li>Não realizamos rastreamento para fins de marketing ou publicidade</li>
                <li>Os dados são armazenados exclusivamente no seu navegador</li>
                <li>O uso desses recursos é fundamentado na <strong>execução do contrato</strong> e na <strong>segurança do sistema</strong>, nos termos da LGPD</li>
              </ul>
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              Ao continuar utilizando o sistema, você declara ciência do uso desses mecanismos essenciais.
            </p>

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              📄 Para mais informações, consulte a{' '}
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline hover:text-primary inline-flex items-center gap-1"
              >
                Política de Privacidade
                <ExternalLink className="h-3 w-3" />
              </a>
              .
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
