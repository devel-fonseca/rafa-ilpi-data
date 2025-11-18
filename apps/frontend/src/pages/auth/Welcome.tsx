import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, Mail, Lock, ArrowRight, Users, FileText, Activity } from 'lucide-react'

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
      <div className="max-w-2xl w-full">
        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header com ícone de sucesso */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-white rounded-full p-4">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Perfil da ILPI criado!
            </h1>
            <p className="text-green-50 text-lg">
              Bem-vindo ao RAFA ILPI, Administrador!
            </p>
          </div>

          {/* Conteúdo */}
          <div className="p-8">
            <p className="text-gray-600 text-center mb-8">
              Sua instituição <span className="font-semibold text-gray-900">{state.tenantName}</span> foi cadastrada com sucesso.
              <br />
              Agora você já pode acessar o sistema usando as credenciais definidas no cadastro.
            </p>

            {/* Informações de Acesso */}
            <div className="bg-blue-50 rounded-xl p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-600" />
                Informações de Acesso
              </h2>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">E-mail de acesso:</p>
                    <p className="text-gray-900 font-semibold">{state.adminEmail}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Senha de acesso:</p>
                    <p className="text-gray-900">A senha que você definiu no cadastro</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Próximos Passos */}
            <div className="bg-purple-50 rounded-xl p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                O que fazer agora?
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="text-gray-700">
                    Faça login com o e-mail e a senha acima.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="text-gray-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    Complete o perfil da sua ILPI.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <p className="text-gray-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    Cadastre os primeiros usuários da equipe.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    4
                  </div>
                  <p className="text-gray-700 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-600" />
                    Comece a registrar residentes, registros diários e medicações.
                  </p>
                </div>
              </div>
            </div>

            {/* Botão de Ação */}
            <button
              onClick={handleGoToLogin}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              Acessar Painel
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Rodapé */}
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              Precisa de ajuda? Entre em contato:{' '}
              <a
                href="mailto:suporte@rafalabs.com.br"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                suporte@rafalabs.com.br
              </a>
            </p>
          </div>
        </div>

        {/* Texto adicional abaixo do card */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Bem-vindo à família RAFA ILPI! 🎉
        </p>
      </div>
    </div>
  )
}
