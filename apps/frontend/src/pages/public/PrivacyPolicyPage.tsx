import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { api } from '@/services/api'
import ReactMarkdown from 'react-markdown'

interface PrivacyPolicy {
  version: string
  effectiveDate: string
  lastUpdated: string
  content: string
}

export function PrivacyPolicyPage() {
  const [policy, setPolicy] = useState<PrivacyPolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPolicy()
  }, [])

  const loadPolicy = async () => {
    try {
      setLoading(true)
      const response = await api.get('/privacy-policy')
      setPolicy(response.data)
    } catch (err) {
      console.error('Erro ao carregar política de privacidade:', err)
      setError('Não foi possível carregar a Política de Privacidade. Tente novamente mais tarde.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-primary">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-lg font-medium">Carregando Política de Privacidade...</p>
        </div>
      </div>
    )
  }

  if (error || !policy) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-danger">Erro ao Carregar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex gap-3">
              <Button onClick={loadPolicy} variant="outline">
                Tentar Novamente
              </Button>
              <Link to="/">
                <Button>Voltar ao Início</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container max-w-5xl mx-auto p-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>Versão {policy.version}</span>
            <span className="text-muted-foreground/70">•</span>
            <span>Atualizada em {policy.lastUpdated}</span>
          </div>
        </div>

        {/* Conteúdo da Política */}
        <Card>
          <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardTitle className="text-2xl">Política de Privacidade</CardTitle>
            <CardDescription className="text-primary/10">
              Sistema Rafa ILPI - Gestão de Instituições de Longa Permanência para Idosos
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/80 prose-a:text-primary prose-strong:text-foreground prose-li:text-foreground/80">
              <ReactMarkdown>{policy.content}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <Card className="bg-primary/5 border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <FileText className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-primary/95">
                  Dúvidas sobre Privacidade?
                </p>
                <p className="text-sm text-primary/80">
                  Entre em contato com nosso Encarregado de Proteção de Dados (DPO) através do e-mail{' '}
                  <a href="mailto:dpo@rafalabs.com.br" className="underline font-medium">
                    dpo@rafalabs.com.br
                  </a>
                </p>
                <p className="text-xs text-primary mt-3">
                  <strong>Observação:</strong> Se você é responsável legal de um residente, entre em contato diretamente com a ILPI onde o residente está institucionalizado para exercer seus direitos LGPD.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
