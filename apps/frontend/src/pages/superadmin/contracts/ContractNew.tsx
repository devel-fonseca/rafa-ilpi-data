import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateTermsOfService } from '@/hooks/useTermsOfService'
import { getNextVersion } from '@/api/terms-of-service.api'
import { getPlans } from '@/api/plans.api'
import type { Plan } from '@/api/plans.api'
import { toast } from 'sonner'

// Template padrão RAFA ILPI - Termos de Uso v1.0 (Oficial)
const DEFAULT_CONTRACT_TEMPLATE = `<h1>TERMO DE ACEITE E TERMOS DE USO – PLATAFORMA RAFA ILPI</h1>

<p><strong>Plano contratado:</strong> {{plan.displayName}} (<code>{{plan.name}}</code>)<br><strong>Data:</strong> {{today}}</p>

<hr>

<h2>1. Identificação das Partes</h2>
<p><strong>CONTRATADA:</strong></p>
<p><strong>RAFA LABS DESENVOLVIMENTO E TECNOLOGIA I.S.</strong> CNPJ nº <strong>63.409.303/0001-82</strong> E-mails institucionais:</p>
<ul>
  <li>Contato: contato@rafalabs.com.br</li>
  <li>Financeiro: financeiro@rafalabs.com.br</li>
  <li>Suporte: suporte@rafalabs.com.br</li>
</ul>
<hr>
<p><strong>CONTRATANTE (Pessoa Jurídica):</strong></p>
<p><strong>Nome:</strong> {{tenant.name}} <strong>CNPJ:</strong> {{tenant.cnpj}} <strong>E-mail de contato:</strong> {{tenant.email}}</p>
<hr>
<p><strong>RESPONSÁVEL PELO ACEITE / REPRESENTANTE (Pessoa Física):</strong></p>
<p><strong>Nome:</strong> {{user.name}} <strong>CPF:</strong> {{user.cpf}} <strong>E-mail:</strong> {{user.email}}</p>
<p><em>O responsável identificado acima declara, no momento do aceite, possuir poderes para representar a Contratante e assumir as obrigações deste Termo.</em></p>
<hr>
<h2>2. Objeto e Natureza do Serviço (SaaS)</h2>
<p>2.1. Este Termo regula o acesso e o uso da plataforma <strong>RAFA ILPI</strong>, solução digital destinada ao apoio à gestão administrativa, operacional e documental de Instituições de Longa Permanência para Idosos (ILPIs), na modalidade <strong>Software as a Service (SaaS)</strong>.</p>
<p>2.2. A Contratada concede à Contratante uma <strong>licença de uso</strong> do sistema, <strong>não exclusiva, intransferível, revogável e limitada</strong> ao período de assinatura ativa e às condições deste Termo.</p>
<p>2.3. O sistema constitui <strong>ferramenta de apoio</strong> à organização e ao registro de informações, <strong>não substituindo obrigações legais, regulatórias, técnicas, administrativas ou assistenciais</strong> da Contratante.</p>
<p>2.4. A Contratada <strong>não realiza avaliação clínica, diagnóstico, prescrição, validação assistencial ou tomada de decisão em saúde</strong>, limitando-se a fornecer infraestrutura tecnológica para registro e organização de informações pela Contratante e seus profissionais autorizados.</p>
<p>2.5. <strong>Aviso de uso e responsabilidade.</strong> A Contratante declara ciência de que o RAFA ILPI é ferramenta de apoio e organização, não substitui rotinas internas, profissionais habilitados, protocolos assistenciais e obrigações legais e regulatórias. A Contratante permanece integralmente responsável por validar, revisar e executar as decisões e condutas adotadas com base nas informações registradas no sistema.</p>
<hr>
<h2>3. Plano Contratado, Limites e Preço</h2>
<p>3.1. A Contratante adere ao plano <strong>{{plan.displayName}}</strong> (<code>{{plan.name}}</code>), pelo valor de <strong>{{plan.price}}</strong>, cobrado de forma recorrente conforme periodicidade definida no momento da contratação.</p>
<p>3.2. O plano contratado contempla os seguintes <strong>limites operacionais</strong>:</p>
<ul>
  <li><strong>Máximo de usuários:</strong> {{plan.maxUsers}}</li>
  <li><strong>Máximo de residentes:</strong> {{plan.maxResidents}}</li>
</ul>
<p>3.3. Caso aplicável, a Contratante poderá usufruir de <strong>período de teste (trial)</strong> de <strong>{{trial.days}} dias</strong>. Encerrado o período de trial, a cobrança será iniciada automaticamente, salvo cancelamento prévio.</p>
<p>3.4. A superação dos limites do plano poderá resultar em <strong>bloqueio técnico</strong> de novas inclusões, necessidade de migração de plano ou contratação adicional, sem que isso configure falha ou inadimplemento da Contratada.</p>
<hr>
<h2>4. Pagamento, Vencimento e Reajuste</h2>
<p>4.1. O pagamento será realizado de forma <strong>recorrente e automática</strong>, conforme periodicidade escolhida pela Contratante:</p>
<ul>
  <li><strong>Mensal:</strong> vencimento no mesmo dia do mês da contratação</li>
  <li><strong>Anual:</strong> vencimento no mesmo mês/dia da contratação (com desconto quando aplicável)</li>
</ul>
<p>4.2. <strong>Formas de pagamento aceitas:</strong></p>
<ul>
  <li>Boleto bancário (vencimento em até 5 dias úteis após emissão)</li>
  <li>PIX (pagamento instantâneo)</li>
  <li>Cartão de crédito (débito automático recorrente)</li>
</ul>
<p>4.3. O processamento de pagamentos é realizado através de plataforma de pagamentos especializada.</p>
<p>4.4. A Contratada <strong>não armazena</strong> dados completos de cartão de crédito, apenas tokens fornecidos pelo processador de pagamentos.</p>
<h3>4.5. Reajuste de preço</h3>
<p>4.5.1. O valor da assinatura poderá ser reajustado <strong>anualmente</strong>, contado da data de início da assinatura ou do primeiro pagamento confirmado, com base na variação acumulada do <strong>IPCA/IBGE</strong>.</p>
<p>4.5.2. Na hipótese de extinção do índice indicado, será aplicado índice oficial que o substitua. Na ausência, poderá ser adotado índice equivalente, preservando o equilíbrio econômico da assinatura.</p>
<p>4.5.3. Além do reajuste anual, a Contratada poderá atualizar os valores em caso de <strong>alteração relevante de custos operacionais</strong>, tais como infraestrutura, tributos, meios de pagamento, serviços essenciais de terceiros ou exigências regulatórias que impactem diretamente a prestação do serviço.</p>
<p>4.5.4. A Contratante será comunicada com antecedência mínima de <strong>30 (trinta) dias</strong>, por e-mail cadastrado e/ou aviso no sistema.</p>
<p>4.5.5. A continuidade de uso após a vigência do reajuste será considerada <strong>aceite do novo valor</strong>, sem prejuízo do direito de cancelamento antes da renovação do ciclo de cobrança.</p>
<hr>
<h2>5. Vigência, Cancelamento e Suspensão</h2>
<p>5.1. Este Termo entra em vigor na data do aceite eletrônico e vigora por <strong>prazo indeterminado</strong>, enquanto houver assinatura ativa.</p>
<p>5.2. A Contratante poderá solicitar o <strong>cancelamento a qualquer tempo</strong>, produzindo efeitos ao final do período já pago.</p>
<h3>5.3. Inadimplência e suspensão</h3>
<p>5.3.1. Em caso de inadimplência, o sistema poderá exibir <strong>aviso de cobrança pendente</strong> aos usuários da Contratante.</p>
<p>5.3.2. Após <strong>5 (cinco) dias corridos</strong> de atraso, o acesso poderá ser <strong>suspenso temporariamente</strong> (modo somente leitura).</p>
<p>5.3.3. Após <strong>15 (quinze) dias corridos</strong> de atraso, o acesso poderá ser <strong>bloqueado totalmente</strong>, sem prejuízo da cobrança dos valores devidos.</p>
<p>5.3.4. O acesso será restaurado em até <strong>24 horas</strong> após confirmação do pagamento.</p>
<p>5.3.5. A suspensão por inadimplência <strong>não implica exclusão imediata de dados</strong>, que permanecerão armazenados por até <strong>90 (noventa) dias</strong> após o bloqueio.</p>
<p>5.5. <strong>Suspensão por segurança.</strong> A Contratada poderá suspender temporariamente acessos ou funcionalidades, total ou parcialmente, caso identifique indícios razoáveis de risco à segurança, abuso, violação deste Termo, tentativa de acesso indevido ou incidente que comprometa a integridade da plataforma, comunicando a Contratante em prazo razoável.</p>
<h3>5.4. Cancelamento e exclusão de dados</h3>
<p>5.4.1. Após o cancelamento, a Contratante terá <strong>90 (noventa) dias</strong> para exportar dados completos do sistema.</p>
<p>5.4.2. Decorrido o prazo, os dados administrativos poderão ser excluídos permanentemente.</p>
<p>5.4.3. A Contratada disponibiliza meios técnicos para exportação e portabilidade, cabendo à Contratante cumprir seus deveres legais de guarda e arquivamento conforme a legislação aplicável.</p>
<hr>
<h2>6. Alteração de Planos, Recursos e Preços (Upgrade/Downgrade)</h2>
<p>6.1. A Contratante poderá solicitar <strong>upgrade de plano</strong> a qualquer momento, com aplicação imediata e cobrança proporcional (<strong>pro rata</strong>) no período vigente.</p>
<p>6.2. A Contratante poderá solicitar <strong>downgrade de plano</strong>, com efeito a partir da próxima renovação.</p>
<p>6.3. O downgrade poderá ser bloqueado tecnicamente caso a Contratante possua quantidade de usuários, residentes ou consumo de recursos acima do limite do novo plano, cabendo à Contratante adequar previamente sua conta.</p>
<h3>6.4. Alteração de planos e preços pela Contratada</h3>
<p>6.4.1. A Contratada poderá, a seu critério, <strong>criar, alterar, reorganizar, renomear, substituir, descontinuar ou reprecificar</strong> planos, módulos, recursos, limites operacionais e funcionalidades da plataforma.</p>
<p>6.4.2. As alterações <strong>não terão efeito retroativo</strong> sobre valores já pagos, produzindo efeitos, quando aplicável, <strong>a partir do próximo ciclo de cobrança</strong>.</p>
<p>6.4.3. Em caso de alteração que impacte o preço ou limites do plano ativo, a Contratada comunicará a Contratante com antecedência mínima de <strong>30 (trinta) dias</strong>, por e-mail cadastrado e/ou aviso no sistema.</p>
<p>6.4.4. Caso a Contratante não concorde com as novas condições, poderá solicitar o cancelamento antes da renovação do ciclo de cobrança, mantendo o acesso até o final do período já pago.</p>
<p>6.4.5. A continuidade de uso após a vigência da alteração será considerada <strong>aceite das novas condições</strong>, sem prejuízo das regras de cancelamento previstas neste Termo.</p>
<hr>
<h2>7. Acesso, Disponibilidade e Atualizações</h2>
<p>7.1. O acesso ao sistema é remoto, não exclusivo e depende de disponibilidade técnica.</p>
<p>7.2. A Contratada empregará <strong>melhores esforços</strong> para manter a plataforma disponível, <strong>sem garantia de disponibilidade contínua ou ininterrupta</strong>.</p>
<p>7.3. O sistema poderá sofrer interrupções pontuais para manutenção, atualização, correções de segurança ou adequações legais.</p>
<p>7.4. A Contratada poderá modificar interfaces, fluxos e funcionalidades, desde que preserve a finalidade essencial do serviço.</p>
<p>7.5. Não se caracteriza falha na prestação do serviço a indisponibilidade decorrente de fatores externos (internet, energia, dispositivos, serviços de terceiros).</p>
<p>7.6. <strong>Alertas e notificações.</strong> Caso o sistema disponibilize alertas, lembretes, avisos por e-mail, WhatsApp ou notificações internas, a Contratante reconhece que tais recursos possuem caráter auxiliar. A Contratada não garante entrega, leitura ou acionamento em tempo real, nem se responsabiliza por falhas decorrentes de configurações, filtros, indisponibilidade de terceiros ou desativação pelo usuário.</p>
<hr>
<h2>8. Suporte Técnico</h2>
<p>8.1. O suporte será prestado por e-mail e WhatsApp comercial, em regime de melhores esforços.</p>
<p>8.2. <strong>Canais de suporte:</strong></p>
<ul>
  <li>E-mail: suporte@rafalabs.com.br</li>
  <li>WhatsApp: (19) 98152-4849, a critério da Contratada (planos)</li>
</ul>
<p>8.3. <strong>Horário de atendimento:</strong></p>
<ul>
  <li>Segunda a Sexta: 9h às 18h (horário de Brasília)</li>
  <li>Sábados, Domingos e Feriados: apenas emergências críticas, a critério da Contratada (via e-mail)</li>
</ul>
<p>8.4. A Contratada poderá priorizar incidentes críticos que afetem a disponibilidade total do sistema, sem garantia de tempo de resolução.</p>
<hr>
<h2>9. Backup e Recuperação de Dados</h2>
<p>9.1. A Contratada adota rotinas regulares de backup compatíveis com boas práticas, sem garantia de prazo específico para restauração.</p>
<p>9.2. A Contratante poderá solicitar exportação manual de dados a qualquer momento, nos formatos:</p>
<ul>
  <li>PDF</li>
  <li>JSON</li>
  <li>CSV</li>
</ul>
<p>9.3. Não há garantia absoluta de recuperação total em cenários excepcionais, cabendo à Contratada empregar melhores esforços para minimizar perdas e restabelecer o acesso.</p>
<hr>
<h2>10. Obrigações da Contratante e dos Usuários</h2>
<p>10.1. Utilizar o sistema de forma lícita e conforme a legislação vigente.</p>
<p>10.2. Garantir autorização legal e regulatória para inserir, tratar e armazenar os dados cadastrados.</p>
<p>10.3. Manter controle sobre usuários, perfis de acesso e credenciais.</p>
<p>10.4. Assumir responsabilidade pelas informações inseridas, atualizadas ou omitidas no sistema.</p>
<p>10.5. Obter consentimento de responsáveis legais dos residentes quando exigido, ou adotar outra base legal aplicável.</p>
<p>10.6. Cumprir obrigações da RDC 502/2021 ANVISA e demais normas aplicáveis a ILPIs.</p>
<p>10.7. <strong>Conferência e validação.</strong> A Contratante compromete-se a manter rotinas internas de conferência e validação das informações registradas no sistema, incluindo, quando aplicável, registros clínicos, prescrições, sinais vitais, intercorrências, vacinações, escalas e documentos operacionais, reconhecendo que o uso do sistema não elimina a necessidade de revisão humana.</p>
<p>10.8. <strong>Uso proibido.</strong> É vedado à Contratante e seus usuários: a) utilizar o sistema para fins ilícitos ou em desconformidade com normas sanitárias, éticas e de proteção de dados; b) tentar acessar dados de terceiros ou burlar controles de acesso; c) inserir conteúdo malicioso (vírus, scripts, automações abusivas); d) praticar engenharia reversa, cópia ou exploração indevida da plataforma; e) revender, sublicenciar ou disponibilizar acesso a terceiros não autorizados.</p>
<hr>
<h2>11. Dados Pessoais, Dados Sensíveis e LGPD</h2>
<p>11.1. A Contratada realizará tratamento de dados pessoais nos limites necessários à execução deste Termo, observando a Lei nº 13.709/2018 (LGPD).</p>
<p>11.2. A Contratante declara-se <strong>Controladora</strong> dos dados inseridos no sistema, incluindo dados pessoais e dados pessoais sensíveis (dados de saúde).</p>
<p>11.3. A Contratada atuará como <strong>Operadora</strong>, tratando dados conforme as instruções da Contratante e as funcionalidades disponibilizadas.</p>
<p>11.4. O RAFA ILPI poderá armazenar dados sensíveis de saúde inseridos e geridos exclusivamente pela Contratante e seus usuários autorizados.</p>
<p>11.5. A Contratada não realiza avaliação clínica, diagnóstico, prescrição ou validação assistencial.</p>
<p>11.6. A Contratante declara possuir autorização legal e regulatória para coletar e tratar dados sensíveis inseridos.</p>
<p>11.7. A Contratada adota medidas técnicas e organizacionais adequadas para proteção contra acessos não autorizados, perdas ou incidentes.</p>
<p>11.8. A Contratante declara ciência e concordância com a Política de Privacidade da plataforma, disponível em: https://rafalabs.com.br/politica-de-privacidade</p>
<h3>11.9. Suboperadores</h3>
<p>11.9.1. A Contratada poderá utilizar terceiros (hospedagem, armazenamento, pagamentos), com padrões equivalentes de segurança e confidencialidade.</p>
<p>11.9.2. A Contratada notificará alteração de suboperadores críticos com 30 dias de antecedência, quando aplicável.</p>
<h3>11.10. Incidentes de segurança</h3>
<p>11.10.1. A Contratada comunicará a Contratante em prazo razoável após confirmação e avaliação de impacto.</p>
<p>11.10.2. A Contratante permanece responsável por comunicações a titulares e responsáveis legais, quando cabíveis, com suporte técnico da Contratada quando solicitado.</p>
<h3>11.11. Propriedade dos dados</h3>
<p>11.11.1. Os dados inseridos no sistema são de propriedade da Contratante.</p>
<p>11.11.2. A Contratada não vende, transfere ou utiliza dados da Contratante para treinamento de IA, marketing ou terceiros não autorizados.</p>
<p>11.11.3. A Contratada poderá acessar dados apenas para suporte, correção de bugs críticos (com notificação posterior) ou cumprimento de ordem judicial.</p>
<p>11.11.4. Todo acesso será registrado em log de auditoria.</p>
<hr>
<h2>12. Auditoria e Conformidade</h2>
<p>12.1. A Contratada poderá fornecer relatório declaratório de conformidade LGPD mediante solicitação.</p>
<p>12.2. Não será permitida auditoria técnica direta em sistemas da Contratada, em razão de multi-tenant, segredos comerciais e risco de exposição de terceiros.</p>
<p>12.3. A Contratada poderá fornecer documentos genéricos de conformidade, sem acesso direto à infraestrutura.</p>
<hr>
<h2>13. Limitação de Responsabilidade</h2>
<p>13.1. O RAFA ILPI é ferramenta de apoio e não substitui controles internos, profissionais habilitados ou obrigações legais.</p>
<p>13.2. A Contratada não será responsável por danos indiretos, lucros cessantes, perda de chance, decisões tomadas com base nos dados, erros de cadastro, indisponibilidade externa ou força maior.</p>
<p>13.3. <strong>Teto de responsabilidade.</strong> Em qualquer hipótese, eventual responsabilidade da Contratada ficará limitada ao valor efetivamente pago pela Contratante nos <strong>12 (doze) meses anteriores</strong> ao evento que originou a reclamação, excluídos tributos, encargos de meios de pagamento e valores de terceiros, sem prejuízo das exclusões previstas neste Termo.</p>
<hr>
<h2>14. Atualizações deste Termo e Reaceite</h2>
<p>14.1. A Contratada poderá publicar novas versões deste Termo para atualização legal, técnica, comercial ou operacional.</p>
<p>14.2. O sistema poderá exigir novo aceite eletrônico como condição de continuidade.</p>
<p>14.3. Alterações substanciais serão comunicadas com antecedência mínima de 30 dias.</p>
<hr>
<h2>15. Propriedade Intelectual</h2>
<p>15.1. Todos os direitos de propriedade intelectual do RAFA ILPI pertencem exclusivamente à Contratada.</p>
<p>15.2. Este Termo não transfere direitos de propriedade, concedendo apenas licença de uso.</p>
<p>15.3. É vedado copiar, modificar, realizar engenharia reversa, sublicenciar ou ceder acesso a terceiros.</p>
<hr>
<h2>16. Confidencialidade</h2>
<p>16.1. As partes manterão sigilo sobre informações confidenciais trocadas.</p>
<p>16.2. Exceções: informações públicas, obtidas de terceiros, desenvolvidas independentemente ou divulgadas por ordem judicial/legal.</p>
<p>16.3. A confidencialidade permanece por 5 anos após o término.</p>
<hr>
<h2>17. Caso Fortuito e Força Maior</h2>
<p>17.1. Nenhuma parte será responsabilizada por eventos de caso fortuito ou força maior.</p>
<p>17.2. A parte afetada comunicará imediatamente a outra.</p>
<p>17.3. Persistindo por mais de 30 dias, qualquer parte poderá rescindir sem ônus.</p>
<hr>
<h2>18. Aceite Eletrônico e Validade Jurídica</h2>
<p>18.1. Ao clicar em "Aceitar", o responsável declara ciência e concordância integral com este Termo, em nome da Contratante.</p>
<p>18.2. O aceite eletrônico será registrado com:</p>
<ul>
  <li>Data e hora (timestamp)</li>
  <li>Identificação do responsável e da Contratante</li>
  <li>IP de origem</li>
  <li>Hash SHA-256 do conteúdo aceito</li>
  <li>Versão do Termo</li>
</ul>
<p>18.3. O registro constitui prova documental para todos os efeitos legais.</p>
<hr>
<h2>19. Disposições Gerais</h2>
<p>19.1. Este Termo substitui acordos anteriores sobre o mesmo objeto.</p>
<p>19.2. A invalidade de cláusula não invalida as demais.</p>
<p>19.3. A tolerância não implica renúncia ou novação.</p>
<p>19.4. Este Termo não cria sociedade, mandato ou vínculo empregatício.</p>
<p>19.5. Cessão: nenhuma parte poderá ceder este Termo sem anuência prévia e escrita da outra.</p>
<hr>
<h2>20. Foro e Lei Aplicável</h2>
<p>20.1. Aplica-se a legislação brasileira, especialmente:</p>
<ul>
  <li>Lei nº 13.709/2018 (LGPD)</li>
  <li>Lei nº 10.406/2002 (Código Civil)</li>
  <li>RDC 502/2021 ANVISA</li>
  <li>Resolução CFM 1.821/2007 (quando aplicável)</li>
</ul>
<p>20.2. Fica eleito o foro da comarca de <strong>Campinas/SP</strong>, com renúncia de qualquer outro.</p>
<p>20.3. As partes poderão buscar mediação ou arbitragem antes do Judiciário, por comum acordo.</p>
<hr>
<h2>Identificação para fins de registro do aceite</h2>
<p><strong>Pessoa Jurídica (Contratante):</strong> Nome: {{tenant.name}} CNPJ: {{tenant.cnpj}} E-mail: {{tenant.email}}</p>
<p><strong>Pessoa Física (Responsável pelo aceite):</strong> Nome: {{user.name}} CPF: {{user.cpf}} E-mail: {{user.email}}</p>
<p><strong>Data do aceite:</strong> {{today}} <strong>Versão:</strong> 1.0 <strong>Hash SHA-256:</strong> [gerado automaticamente pelo sistema no momento do aceite]</p>`

export function ContractNew() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('Termo de Aceite e Termos de Uso – Plataforma RAFA ILPI')
  const [content, setContent] = useState(DEFAULT_CONTRACT_TEMPLATE)
  const [planId, setPlanId] = useState<string>('ALL')
  const [plans, setPlans] = useState<Plan[]>([])

  const createContract = useCreateTermsOfService()

  // Carregar planos ao montar componente
  useEffect(() => {
    async function loadPlans() {
      try {
        const data = await getPlans()
        setPlans(data)
      } catch (error) {
        toast.error('Erro ao carregar planos')
      }
    }
    loadPlans()
  }, [])

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

      navigate('/superadmin/contracts')
    } catch (error) {
      toast.error('Erro ao criar contrato')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/superadmin/contracts')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Criar Novo Termo de Uso</h1>
            <p className="text-muted-foreground">Preencha os campos para criar um termo de uso DRAFT</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Configurações Básicas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  ? 'Termo de uso genérico aplicável a todos os planos'
                  : 'Termo de uso específico para este plano'}
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
          </div>

          <div className="mt-4 p-3 bg-primary/5 border border-primary/30 rounded-lg">
            <p className="text-xs text-primary/95">
              <strong>ℹ️ Versionamento automático:</strong> A versão será gerada automaticamente ao criar o termo de uso.
              {planId === 'ALL'
                ? ' Próxima versão do termo de uso genérico.'
                : ' Próxima versão para o plano selecionado.'}
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-lg mb-3">Conteúdo do Termo de Uso</h3>
            <Card className="p-4 bg-primary/5 border-primary/30">
              <p className="text-xs font-semibold text-primary/95 mb-2">
                📝 Variáveis disponíveis para usar no termo de uso:
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-primary/90">
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{tenant.name}}'}</code> - Nome do tenant</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{tenant.cnpj}}'}</code> - CNPJ do tenant</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{tenant.email}}'}</code> - Email do tenant</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{user.name}}'}</code> - Nome do responsável</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{user.cpf}}'}</code> - CPF do responsável</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{user.email}}'}</code> - Email do responsável</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{plan.name}}'}</code> - Nome técnico do plano</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{plan.displayName}}'}</code> - Nome de exibição do plano</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{plan.price}}'}</code> - Preço do plano</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{plan.maxUsers}}'}</code> - Máximo de usuários</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{plan.maxResidents}}'}</code> - Máximo de residentes</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{trial.days}}'}</code> - Dias de trial</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{today}}'}</code> - Data de hoje</div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label htmlFor="content" className="text-sm font-medium mb-2 block">
                Editor HTML
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="<h1>Contrato</h1><p>{{tenant.name}}</p>"
                className="font-mono text-sm h-[600px] resize-none"
                required
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Preview ao vivo</Label>
              <div className="border rounded h-[600px] p-6 bg-white overflow-auto">
                {content ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm text-center mt-8">
                    Digite o HTML à esquerda para ver o preview
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/superadmin/contracts')}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={createContract.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createContract.isPending ? 'Criando...' : 'Criar Termo de Uso'}
          </Button>
        </div>
      </form>
    </div>
  )
}
