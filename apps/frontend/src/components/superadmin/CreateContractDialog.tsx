import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateContract } from '@/hooks/useContracts'
import { getNextVersion } from '@/api/contracts.api'
import { getPlans } from '@/api/plans.api'
import type { Plan } from '@/api/plans.api'
import { toast } from 'sonner'

// Template padrão RAFA ILPI
const DEFAULT_CONTRACT_TEMPLATE = `<h1>Contrato de Prestação de Serviços – Plataforma RAFA ILPI</h1>

<p>
<strong>Plano contratado:</strong> {{plan.displayName}} (<code>{{plan.name}}</code>)<br>
<strong>Data:</strong> {{today}}
</p>

<hr>

<h2>1. Identificação das Partes</h2>

<p>
<strong>CONTRATADA:</strong><br>
RAFA LABS DESENVOLVIMENTO E TECNOLOGIA I.S.<br>
CNPJ nº <strong>63.409.303/0001-82</strong><br>
E-mails institucionais:<br>
• Contato: <a href="mailto:contato@rafalabs.com.br">contato@rafalabs.com.br</a><br>
• Financeiro: <a href="mailto:financeiro@rafalabs.com.br">financeiro@rafalabs.com.br</a><br>
• Suporte: <a href="mailto:suporte@rafalabs.com.br">suporte@rafalabs.com.br</a>
</p>

<p>
<strong>CONTRATANTE (Pessoa Jurídica):</strong><br>
<strong>Nome:</strong> {{tenant.name}}<br>
<strong>CNPJ:</strong> {{tenant.cnpj}}<br>
<strong>E-mail de contato:</strong> {{tenant.email}}
</p>

<p>
<strong>RESPONSÁVEL PELA CONTRATAÇÃO / REPRESENTANTE NO ACEITE (Pessoa Física):</strong><br>
<strong>Nome:</strong> {{user.name}}<br>
<strong>CPF:</strong> {{user.cpf}}<br>
<strong>E-mail:</strong> {{user.email}}
</p>

<p>
<em>O responsável identificado acima declara, no momento do aceite, possuir poderes para representar a Contratante e assumir as obrigações deste contrato.</em>
</p>

<hr>

<h2>2. Objeto</h2>

<p>
2.1. O presente contrato tem por objeto a disponibilização do sistema <strong>RAFA ILPI</strong>, plataforma digital destinada ao apoio à gestão administrativa, operacional e documental de Instituições de Longa Permanência para Idosos (ILPIs), na modalidade <strong>Software as a Service (SaaS)</strong>.
</p>

<p>
2.2. O sistema constitui ferramenta de apoio à organização e ao registro de informações, não substituindo obrigações legais, regulatórias, técnicas, administrativas ou assistenciais da Contratante.
</p>

<hr>

<h2>3. Plano contratado, limites e preço</h2>

<p>
3.1. A Contratante adere ao plano <strong>{{plan.displayName}}</strong> (<code>{{plan.name}}</code>), pelo valor de <strong>{{plan.price}}</strong>, cobrado de forma recorrente, conforme periodicidade definida no momento da contratação.
</p>

<p>
3.2. O plano contratado contempla os seguintes limites operacionais:
</p>

<ul>
  <li><strong>Máximo de usuários:</strong> {{plan.maxUsers}}</li>
  <li><strong>Máximo de residentes:</strong> {{plan.maxResidents}}</li>
</ul>

<p>
3.3. Caso aplicável, a Contratante poderá usufruir de período de teste (trial) de <strong>{{trial.days}} dias</strong>. Encerrado o período de trial, a cobrança será iniciada automaticamente, salvo cancelamento prévio.
</p>

<p>
3.4. A superação dos limites do plano poderá resultar em bloqueio técnico de novas inclusões, necessidade de migração de plano ou contratação adicional, sem que isso configure falha ou inadimplemento da Contratada.
</p>

<hr>

<h2>4. Vigência, cancelamento e suspensão</h2>

<p>
4.1. O presente contrato entra em vigor na data do aceite eletrônico e vigora por prazo indeterminado enquanto houver assinatura ativa.
</p>

<p>
4.2. A Contratante poderá solicitar o cancelamento a qualquer tempo, produzindo efeitos ao final do período já pago.
</p>

<p>
4.3. O inadimplemento autoriza a <strong>suspensão do acesso ao sistema</strong>, após comunicação realizada no próprio ambiente do RAFA ILPI, sem prejuízo da cobrança de valores eventualmente devidos.
</p>

<p>
4.4. A suspensão ou o cancelamento do acesso não implica exclusão imediata de dados, observadas as políticas técnicas e legais aplicáveis.
</p>

<hr>

<h2>5. Acesso, disponibilidade e atualizações</h2>

<p>
5.1. O acesso ao sistema é remoto, não exclusivo e condicionado à disponibilidade técnica, podendo sofrer interrupções pontuais para manutenção, atualização, correções de segurança ou adequações legais.
</p>

<p>
5.2. A Contratada poderá, a seu critério, modificar interfaces, fluxos e funcionalidades, desde que preservada a finalidade essencial do serviço.
</p>

<p>
5.3. Não se caracteriza falha na prestação do serviço a indisponibilidade decorrente de fatores externos, tais como falhas de internet, energia, dispositivos da Contratante ou serviços de terceiros.
</p>

<hr>

<h2>6. Obrigações e responsabilidades da Contratante</h2>

<ul>
  <li>6.1. Utilizar o sistema de forma lícita, ética e conforme a legislação vigente.</li>
  <li>6.2. Garantir que possui autorização legal, ética e regulatória para inserir, tratar e armazenar os dados cadastrados no sistema.</li>
  <li>6.3. Manter controle sobre usuários, perfis de acesso e credenciais.</li>
  <li>6.4. Assumir integral responsabilidade pelas informações inseridas, atualizadas ou omitidas no sistema.</li>
</ul>

<hr>

<h2>7. Dados pessoais, dados sensíveis e LGPD</h2>

<p>
7.1. A Contratada realizará o tratamento de dados pessoais exclusivamente nos limites necessários à execução deste contrato, observando a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados – LGPD).
</p>

<p>
7.2. A Contratante declara-se <strong>controladora dos dados</strong> inseridos no sistema, incluindo dados pessoais e <strong>dados pessoais sensíveis</strong>, assumindo integral responsabilidade por sua base legal, finalidade, conteúdo, veracidade e atualização.
</p>

<p>
7.3. A Contratada atuará, para fins da LGPD, na condição de <strong>operadora de dados</strong>, realizando o tratamento conforme as instruções da Contratante e as funcionalidades disponibilizadas no sistema.
</p>

<p>
7.4. O sistema RAFA ILPI poderá armazenar dados sensíveis relacionados à saúde dos residentes, tais como informações clínicas, registros assistenciais, prescrições, evoluções multiprofissionais e dados correlatos, os quais são inseridos, geridos e utilizados exclusivamente pela Contratante e seus usuários autorizados.
</p>

<p>
7.5. A Contratada não realiza avaliação clínica, diagnóstico, prescrição, validação assistencial ou tomada de decisão em saúde, limitando-se a fornecer infraestrutura tecnológica para registro e organização das informações.
</p>

<p>
7.6. A Contratante declara que possui autorização legal, ética e regulatória para coletar, registrar e tratar os dados sensíveis de saúde inseridos no sistema, inclusive consentimento do titular quando exigido, ou outra base legal aplicável.
</p>

<p>
7.7. A Contratada adota medidas técnicas e organizacionais razoáveis para proteção dos dados contra acessos não autorizados, perdas ou incidentes de segurança, sem prejuízo da responsabilidade da Contratante quanto ao uso adequado das informações e à gestão de acessos.
</p>

<p>
7.8. Em caso de incidente de segurança envolvendo dados pessoais, a Contratada comunicará a Contratante em prazo razoável, para que esta adote as providências legais cabíveis perante titulares e autoridades competentes, quando aplicável.
</p>

<hr>

<h2>8. Limitação de responsabilidade</h2>

<p>
8.1. O RAFA ILPI constitui ferramenta de apoio à gestão, não substituindo controles internos, profissionais habilitados ou obrigações legais da Contratante.
</p>

<p>
8.2. A Contratada não será responsável por danos indiretos, lucros cessantes, perda de chance, expectativas de resultado ou decisões tomadas com base nas informações registradas no sistema.
</p>

<p>
8.3. Em nenhuma hipótese a responsabilidade da Contratada excederá o valor efetivamente pago pela Contratante nos últimos 12 (doze) meses de contrato.
</p>

<hr>

<h2>9. Atualizações contratuais e reaceite</h2>

<p>
9.1. A Contratada poderá publicar novas versões deste contrato para atualização legal, técnica, comercial ou operacional.
</p>

<p>
9.2. Quando aplicável, o sistema poderá exigir <strong>novo aceite eletrônico</strong> como condição para continuidade do uso.
</p>

<p>
9.3. A migração para plano vinculado a condições contratuais distintas poderá exigir reaceite prévio, sem que isso configure alteração unilateral indevida.
</p>

<hr>

<h2>10. Aceite eletrônico e validade jurídica</h2>

<p>
10.1. Ao clicar em "Aceitar", o responsável identificado neste instrumento declara que leu, compreendeu e concorda integralmente com os termos deste contrato, em nome da Contratante.
</p>

<p>
10.2. O aceite eletrônico realizado no ambiente do sistema possui plena validade jurídica e será registrado com data, hora, identificação completa do responsável e da Contratante, endereço IP e demais elementos técnicos de integridade.
</p>

<hr>

<p>
<strong>Identificação para fins de registro do aceite:</strong>
</p>

<p>
<strong>Pessoa Jurídica (Contratante):</strong><br>
<strong>Nome:</strong> {{tenant.name}}<br>
<strong>CNPJ:</strong> {{tenant.cnpj}}<br>
<strong>E-mail:</strong> {{tenant.email}}
</p>

<p>
<strong>Pessoa Física (Responsável pelo aceite):</strong><br>
<strong>Nome:</strong> {{user.name}}<br>
<strong>CPF:</strong> {{user.cpf}}<br>
<strong>E-mail:</strong> {{user.email}}
</p>

<p>
<strong>Data do aceite:</strong> {{today}}
</p>`

interface CreateContractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateContractDialog({ open, onOpenChange }: CreateContractDialogProps) {
  const [title, setTitle] = useState('Contrato de Prestação de Serviços – Plataforma RAFA ILPI')
  const [content, setContent] = useState(DEFAULT_CONTRACT_TEMPLATE)
  const [planId, setPlanId] = useState<string>('ALL')
  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)

  const createContract = useCreateContract()

  // Carregar planos ao abrir dialog
  useEffect(() => {
    if (open) {
      async function loadPlans() {
        setLoadingPlans(true)
        try {
          const data = await getPlans()
          setPlans(data)
        } catch (error) {
          toast.error('Erro ao carregar planos')
        } finally {
          setLoadingPlans(false)
        }
      }
      loadPlans()
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Gerar versão automaticamente
      const actualPlanId = planId === 'ALL' ? undefined : planId
      const version = await getNextVersion(actualPlanId, false)

      await createContract.mutateAsync({
        version,
        title,
        content,
        planId: actualPlanId,
      })

      // Reset form
      setTitle('Contrato de Prestação de Serviços – Plataforma RAFA ILPI')
      setContent(DEFAULT_CONTRACT_TEMPLATE)
      setPlanId('ALL')
      onOpenChange(false)
    } catch (error) {
      toast.error('Erro ao criar contrato')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Contrato</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="planId">Plano *</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger id="planId">
                <SelectValue placeholder="Selecione o plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Planos (Genérico)</SelectItem>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {planId === 'ALL'
                ? 'Contrato genérico aplicável a todos os planos'
                : 'Contrato específico para este plano'}
            </p>
          </div>

          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contrato de Prestação de Serviços"
              required
            />
          </div>

          <div className="p-3 bg-primary/5 border border-primary/30 rounded-lg">
            <p className="text-xs text-primary/95">
              <strong>ℹ️ Versionamento automático:</strong> A versão será gerada automaticamente ao criar o contrato.
            </p>
          </div>

          <div>
            <Label>Conteúdo (HTML) *</Label>
            <Card className="mt-2 p-3 bg-primary/5 border-primary/30">
              <p className="text-xs font-semibold text-primary/95 mb-2">
                📝 Variáveis disponíveis:
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-primary/90">
                <div><code className="bg-white px-1 rounded">{'{{tenant.name}}'}</code> - Nome do tenant</div>
                <div><code className="bg-white px-1 rounded">{'{{tenant.cnpj}}'}</code> - CNPJ do tenant</div>
                <div><code className="bg-white px-1 rounded">{'{{tenant.email}}'}</code> - Email do tenant</div>
                <div><code className="bg-white px-1 rounded">{'{{user.name}}'}</code> - Nome do responsável</div>
                <div><code className="bg-white px-1 rounded">{'{{user.cpf}}'}</code> - CPF do responsável</div>
                <div><code className="bg-white px-1 rounded">{'{{user.email}}'}</code> - Email do responsável</div>
                <div><code className="bg-white px-1 rounded">{'{{plan.name}}'}</code> - Nome técnico do plano</div>
                <div><code className="bg-white px-1 rounded">{'{{plan.displayName}}'}</code> - Nome exibição plano</div>
                <div><code className="bg-white px-1 rounded">{'{{plan.price}}'}</code> - Preço do plano</div>
                <div><code className="bg-white px-1 rounded">{'{{plan.maxUsers}}'}</code> - Máximo de usuários</div>
                <div><code className="bg-white px-1 rounded">{'{{plan.maxResidents}}'}</code> - Máximo residentes</div>
                <div><code className="bg-white px-1 rounded">{'{{trial.days}}'}</code> - Dias de trial</div>
                <div><code className="bg-white px-1 rounded">{'{{today}}'}</code> - Data de hoje</div>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <Label htmlFor="content" className="text-xs text-muted-foreground">Editor HTML</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="<h1>Contrato</h1><p>{{tenant.name}}</p>"
                  className="font-mono text-sm min-h-[400px] mt-1"
                  required
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Preview ao vivo</Label>
                <div className="border rounded min-h-[400px] mt-1 p-4 bg-white overflow-auto">
                  {content ? (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: content }}
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Digite o HTML à esquerda para ver o preview
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createContract.isPending}>
              {createContract.isPending ? 'Criando...' : 'Criar Contrato'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
