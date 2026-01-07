import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
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

// Template padrão RAFA ILPI - Contrato v2.0 (Completo)
const DEFAULT_CONTRACT_TEMPLATE = `<h2>Contrato de Prestação de Serviços – Plataforma RAFA ILPI</h2>
<p><strong>Plano contratado:</strong> {{plan.displayName}} (<code>{{plan.name}}</code>)<br>
<strong>Data:</strong> {{today}}</p>
<hr>
<h2>1. Identificação das Partes</h2>
<p><strong>CONTRATADA:</strong></p>
<p><strong>RAFA LABS DESENVOLVIMENTO E TECNOLOGIA I.S.</strong><br>
CNPJ nº <strong>63.409.303/0001-82</strong><br>
E-mails institucionais:</p>
<ul>
<li>Contato: <a href="mailto:contato@rafalabs.com.br">contato@rafalabs.com.br</a></li>
<li>Financeiro: <a href="mailto:financeiro@rafalabs.com.br">financeiro@rafalabs.com.br</a></li>
<li>Suporte: <a href="mailto:suporte@rafalabs.com.br">suporte@rafalabs.com.br</a></li>
</ul>
<hr>
<p><strong>CONTRATANTE (Pessoa Jurídica):</strong></p>
<p><strong>Nome:</strong> {{tenant.name}}<br>
<strong>CNPJ:</strong> {{tenant.cnpj}}<br>
<strong>E-mail de contato:</strong> {{tenant.email}}</p>
<hr>
<p><strong>RESPONSÁVEL PELA CONTRATAÇÃO / REPRESENTANTE NO ACEITE (Pessoa Física):</strong></p>
<p><strong>Nome:</strong> {{user.name}}<br>
<strong>CPF:</strong> {{user.cpf}}<br>
<strong>E-mail:</strong> {{user.email}}</p>
<p><em>O responsável identificado acima declara, no momento do aceite, possuir poderes para representar a Contratante e assumir as obrigações deste contrato.</em></p>
<hr>
<h2>2. Objeto</h2>
<p>2.1. O presente contrato tem por objeto a disponibilização do sistema <strong>RAFA ILPI</strong>, plataforma digital destinada ao apoio à gestão administrativa, operacional e documental de Instituições de Longa Permanência para Idosos (ILPIs), na modalidade <strong>Software as a Service (SaaS)</strong>.</p>
<p>2.2. O sistema constitui <strong>ferramenta de apoio</strong> à organização e ao registro de informações, <strong>não substituindo obrigações legais, regulatórias, técnicas, administrativas ou assistenciais</strong> da Contratante.</p>
<p>2.3. A Contratada <strong>não realiza avaliação clínica, diagnóstico, prescrição ou tomada de decisão em saúde</strong>, limitando-se a fornecer infraestrutura tecnológica para registro e organização de informações pela Contratante e seus profissionais autorizados.</p>
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
<h2>4. Forma de Pagamento e Vencimento</h2>
<p>4.1. O pagamento será realizado de forma <strong>recorrente e automática</strong>, conforme periodicidade escolhida pela Contratante:</p>
<ul>
<li><strong>Mensal:</strong> Vencimento no mesmo dia do mês da contratação</li>
<li><strong>Anual:</strong> Vencimento no mesmo mês/dia da contratação (com desconto quando aplicável)</li>
</ul>
<p>4.2. <strong>Formas de pagamento aceitas:</strong></p>
<ul>
<li>Boleto bancário (vencimento em até 5 dias úteis após emissão)</li>
<li>PIX (pagamento instantâneo)</li>
<li>Cartão de crédito (débito automático recorrente)</li>
</ul>
<p>4.3. O processamento de pagamentos é realizado através de plataforma de pagamentos especializada, que garante segurança para dados financeiros.</p>
<p>4.4. A Contratada <strong>não armazena</strong> dados completos de cartão de crédito, apenas tokens criptografados fornecidos pelo processador de pagamentos.</p>
<hr>
<h2>5. Vigência, Cancelamento e Suspensão</h2>
<p>5.1. O presente contrato entra em vigor na data do aceite eletrônico e vigora por <strong>prazo indeterminado</strong> enquanto houver assinatura ativa.</p>
<p>5.2. A Contratante poderá solicitar o <strong>cancelamento a qualquer tempo</strong>, produzindo efeitos ao final do período já pago.</p>
<h3>5.3. Inadimplência e Suspensão</h3>
<p>5.3.1. Em caso de inadimplência, o sistema exibirá <strong>aviso de cobrança pendente</strong> a todos os usuários da Contratante.</p>
<p>5.3.2. Após <strong>5 (cinco) dias corridos</strong> de atraso, o acesso ao sistema será <strong>suspenso temporariamente</strong> (modo somente leitura).</p>
<p>5.3.3. Após <strong>15 (quinze) dias corridos</strong> de atraso, o acesso será <strong>bloqueado totalmente</strong>, sem prejuízo da cobrança dos valores devidos.</p>
<p>5.3.4. O acesso será restaurado em até <strong>24 horas</strong> após confirmação do pagamento.</p>
<p>5.3.5. A suspensão por inadimplência <strong>não implica exclusão de dados</strong>, que permanecerão armazenados por até <strong>90 (noventa) dias</strong> após o bloqueio.</p>
<h3>5.4. Cancelamento e Exclusão de Dados</h3>
<p>5.4.1. Após o cancelamento do contrato, a Contratante terá <strong>90 (noventa) dias</strong> para exportar dados completos do sistema.</p>
<p>5.4.2. Decorrido o prazo de 90 dias, os dados administrativos serão excluídos permanentemente.</p>
<p>5.4.3. A Contratada <strong>disponibiliza meios técnicos</strong> para que a Contratante cumpra seus deveres legais de guarda de prontuários eletrônicos (Resolução CFM 1.821/2007 – mínimo de 20 anos), mantendo os dados clínicos armazenados pelo prazo que a Contratante determinar, observada a legislação aplicável.</p>
<hr>
<h2>6. Migração de Plano (Upgrade/Downgrade)</h2>
<p>6.1. A Contratante poderá solicitar <strong>upgrade de plano</strong> a qualquer momento, com aplicação imediata e cobrança proporcional (pro rata) no período vigente.</p>
<p>6.2. A Contratante poderá solicitar <strong>downgrade de plano</strong>, com efeito a partir da próxima renovação (evitando cobranças retroativas).</p>
<p>6.3. <strong>Limitações no downgrade:</strong></p>
<ul>
<li>Se a Contratante possui mais usuários ou residentes que o limite do novo plano, o downgrade será <strong>bloqueado tecnicamente</strong> até adequação</li>
<li>A Contratante deverá inativar usuários/residentes excedentes antes de confirmar o downgrade</li>
</ul>
<p>6.4. Migração de plano pode exigir <strong>reaceite de contrato</strong> caso haja alteração substancial de termos.</p>
<hr>
<h2>7. Acesso, Disponibilidade e Atualizações</h2>
<p>7.1. O acesso ao sistema é <strong>remoto, não exclusivo</strong> e condicionado à disponibilidade técnica.</p>
<p>7.2. A Contratada <strong>envidará seus melhores esforços técnicos e operacionais</strong> para manter a disponibilidade do sistema, <strong>sem garantia de disponibilidade contínua ou ininterrupta</strong>.</p>
<p>7.3. O sistema poderá sofrer <strong>interrupções pontuais</strong> para manutenção, atualização, correções de segurança ou adequações legais, preferencialmente em horários de menor impacto.</p>
<p>7.4. A Contratada poderá, a seu critério, modificar interfaces, fluxos e funcionalidades, desde que preservada a finalidade essencial do serviço e <strong>não inviabilize o uso regular do sistema</strong> ou descaracterize sua finalidade principal.</p>
<p>7.5. <strong>Não se caracteriza falha na prestação do serviço</strong> a indisponibilidade decorrente de fatores externos, tais como falhas de internet, energia elétrica, dispositivos da Contratante ou serviços de terceiros.</p>
<hr>
<h2>8. Suporte Técnico</h2>
<p>8.1. O suporte técnico será prestado por <strong>e-mail e WhatsApp comercial</strong>, em regime de <strong>melhores esforços</strong>, sem garantia de prazo específico para resposta ou resolução.</p>
<p>8.2. <strong>Canais de suporte:</strong></p>
<ul>
<li>E-mail: <a href="mailto:suporte@rafalabs.com.br">suporte@rafalabs.com.br</a></li>
<li>WhatsApp: (19) 98152-4849</li>
</ul>
<p>8.3. <strong>Horário de atendimento:</strong></p>
<ul>
<li>Segunda a Sexta: 9h às 18h (horário de Brasília)</li>
<li>Sábados, Domingos e Feriados: Apenas emergências críticas <strong>a critério exclusivo da Contratada</strong> (via e-mail)</li>
</ul>
<p>8.4. A Contratada priorizará atendimento de incidentes críticos que afetem disponibilidade total do sistema, sem garantia de tempo de resolução.</p>
<hr>
<h2>9. Backup e Recuperação de Dados</h2>
<p>9.1. A Contratada adota <strong>rotinas regulares de backup</strong> e procedimentos de recuperação <strong>compatíveis com boas práticas de mercado</strong>, sem garantia de prazo específico para restauração.</p>
<p>9.2. A Contratante pode solicitar <strong>exportação manual de dados</strong> a qualquer momento, nos formatos:</p>
<ul>
<li>PDF (prontuários e relatórios)</li>
<li>JSON (dados estruturados - portabilidade LGPD)</li>
<li>CSV (planilhas para análise externa)</li>
</ul>
<p>9.3. <strong>Não há garantia absoluta de recuperação total</strong> em cenários excepcionais (falha catastrófica, perda de dados ou corrompimento de backups), sendo a Contratada responsável por empregar seus <strong>melhores esforços técnicos</strong> para minimizar perdas e restabelecer o acesso aos dados.</p>
<hr>
<h2>10. Obrigações e Responsabilidades da Contratante</h2>
<p>10.1. Utilizar o sistema de forma <strong>lícita, ética e conforme a legislação vigente</strong>.</p>
<p>10.2. Garantir que possui <strong>autorização legal, ética e regulatória</strong> para inserir, tratar e armazenar os dados cadastrados no sistema.</p>
<p>10.3. Manter <strong>controle sobre usuários, perfis de acesso e credenciais</strong>.</p>
<p>10.4. Assumir <strong>integral responsabilidade</strong> pelas informações inseridas, atualizadas ou omitidas no sistema.</p>
<p>10.5. <strong>Obter consentimento</strong> de responsáveis legais dos residentes para tratamento de dados de saúde, quando exigido pela legislação.</p>
<p>10.6. Cumprir obrigações da <strong>RDC 502/2021 ANVISA</strong> e demais regulamentações aplicáveis a ILPIs.</p>
<hr>
<h2>11. Dados Pessoais, Dados Sensíveis e LGPD</h2>
<p>11.1. A Contratada realizará o tratamento de dados pessoais exclusivamente nos <strong>limites necessários à execução deste contrato</strong>, observando a <strong>Lei nº 13.709/2018 (LGPD)</strong>.</p>
<p>11.2. A Contratante declara-se <strong>controladora dos dados</strong> inseridos no sistema, incluindo dados pessoais e <strong>dados pessoais sensíveis</strong> (dados de saúde), assumindo integral responsabilidade por sua <strong>base legal, finalidade, conteúdo, veracidade e atualização</strong>.</p>
<p>11.3. A Contratada atuará, para fins da LGPD, na condição de <strong>operadora de dados</strong>, realizando o tratamento conforme as instruções da Contratante e as funcionalidades disponibilizadas no sistema.</p>
<p>11.4. O sistema RAFA ILPI poderá armazenar <strong>dados sensíveis relacionados à saúde</strong> dos residentes, tais como informações clínicas, registros assistenciais, prescrições, evoluções multiprofissionais e dados correlatos, os quais são inseridos, geridos e utilizados exclusivamente pela Contratante e seus usuários autorizados.</p>
<p>11.5. A Contratada <strong>não realiza avaliação clínica, diagnóstico, prescrição, validação assistencial ou tomada de decisão em saúde</strong>, limitando-se a fornecer infraestrutura tecnológica para registro e organização das informações.</p>
<p>11.6. A Contratante declara que possui <strong>autorização legal, ética e regulatória</strong> para coletar, registrar e tratar os dados sensíveis de saúde inseridos no sistema, inclusive consentimento do titular quando exigido, ou outra base legal aplicável.</p>
<p>11.7. A Contratada adota <strong>medidas técnicas e organizacionais adequadas</strong>, compatíveis com o estado da técnica e com a natureza dos dados tratados, para proteção dos dados contra acessos não autorizados, perdas ou incidentes de segurança.</p>
<p>11.8. <strong>Política de Privacidade:</strong> A Contratante declara ter lido e concordado com a <strong>Política de Privacidade</strong> da plataforma, disponível em <a href="https://rafalabs.com.br/politica-de-privacidade">https://rafalabs.com.br/politica-de-privacidade</a>, que integra o presente contrato para todos os efeitos legais.</p>
<h3>11.9. Suboperadores de Dados</h3>
<p>11.9.1. A Contratada poderá utilizar <strong>terceiros para suporte à infraestrutura</strong> (hospedagem, armazenamento, processamento de pagamentos), desde que observados <strong>padrões de segurança e confidencialidade equivalentes</strong>.</p>
<p>11.9.2. Todos os suboperadores são contratualmente obrigados a <strong>observar os requisitos do art. 33 da LGPD</strong> para tratamento e transferência internacional de dados pessoais.</p>
<p>11.9.3. A Contratada notificará a Contratante sobre alteração de suboperadores críticos com <strong>30 (trinta) dias de antecedência</strong>, permitindo eventual oposição justificada.</p>
<h3>11.10. Incidentes de Segurança</h3>
<p>11.10.1. Em caso de incidente de segurança envolvendo acesso não autorizado, vazamento ou perda de dados pessoais, a Contratada compromete-se a comunicar a Contratante <strong>em prazo razoável</strong>, após confirmação da ocorrência e avaliação de impacto.</p>
<p>11.10.2. A notificação conterá, no mínimo:</p>
<ul>
<li>Descrição da natureza do incidente</li>
<li>Tipos de dados potencialmente afetados</li>
<li>Número estimado de residentes/usuários impactados</li>
<li>Medidas técnicas já adotadas para mitigação</li>
<li>Recomendações de ações para a Contratante</li>
</ul>
<p>11.10.3. A <strong>responsabilidade de comunicar responsáveis legais e titulares afetados</strong> é da Contratante (na condição de Controladora), com suporte técnico da Contratada quando solicitado.</p>
<h3>11.11. Propriedade dos Dados</h3>
<p>11.11.1. Todos os dados inseridos, armazenados ou processados no sistema são de <strong>propriedade exclusiva da Contratante</strong>.</p>
<p>11.11.2. A Contratada <strong>NÃO</strong> utiliza, compartilha, vende ou transfere dados da Contratante para:</p>
<ul>
<li>Treinamento de modelos de inteligência artificial</li>
<li>Análises estatísticas agregadas (mesmo anonimizadas) sem consentimento prévio</li>
<li>Marketing ou prospecção comercial</li>
<li>Terceiros não autorizados</li>
</ul>
<p>11.11.3. A Contratada poderá acessar dados da Contratante <strong>apenas</strong> para:</p>
<ul>
<li>Suporte técnico (mediante solicitação e autorização da Contratante)</li>
<li>Correção de bugs críticos (com notificação posterior)</li>
<li>Cumprimento de ordem judicial</li>
</ul>
<p>11.11.4. Todo acesso da Contratada aos dados é <strong>registrado em log de auditoria</strong> com identificação do profissional, data/hora e justificativa.</p>
<hr>
<h2>12. Auditoria e Conformidade</h2>
<p>12.1. A Contratada fornecerá, mediante solicitação formal da Contratante, <strong>relatório declaratório de conformidade LGPD</strong> contendo evidências das medidas técnicas e organizacionais de proteção de dados.</p>
<p>12.2. <strong>Não será permitida auditoria técnica presencial ou remota</strong> em sistemas da Contratada, em razão de:</p>
<ul>
<li>Natureza multi-tenant (isolamento de dados de outros clientes)</li>
<li>Segredos comerciais e industriais</li>
<li>Risco de exposição indireta de dados de terceiros</li>
</ul>
<p>12.3. A Contratada poderá fornecer <strong>documentos genéricos</strong> (certificados, relatórios de segurança, políticas internas) que demonstrem conformidade, sem acesso direto a sistemas ou infraestrutura.</p>
<hr>
<h2>13. Limitação de Responsabilidade</h2>
<p>13.1. O RAFA ILPI constitui <strong>ferramenta de apoio</strong> à gestão, <strong>não substituindo controles internos, profissionais habilitados ou obrigações legais</strong> da Contratante.</p>
<p>13.2. A Contratada <strong>não será responsável</strong> por:</p>
<ul>
<li>Danos indiretos, lucros cessantes, perda de chance ou expectativas de resultado</li>
<li>Decisões tomadas com base nas informações registradas no sistema</li>
<li>Erros ou omissões nas informações inseridas pela Contratante</li>
<li>Indisponibilidade decorrente de fatores externos (internet, energia, dispositivos)</li>
<li>Perda de dados por uso inadequado, falha de backup externo ou força maior</li>
</ul>
<p>13.3. Em nenhuma hipótese a responsabilidade da Contratada excederá o <strong>valor efetivamente pago pela Contratante nos últimos 12 (doze) meses</strong> de contrato.</p>
<hr>
<h2>14. Atualizações Contratuais e Reaceite</h2>
<p>14.1. A Contratada poderá publicar novas versões deste contrato para atualização legal, técnica, comercial ou operacional.</p>
<p>14.2. Quando aplicável, o sistema poderá exigir <strong>novo aceite eletrônico</strong> como condição para continuidade do uso.</p>
<p>14.3. A migração para plano vinculado a condições contratuais distintas poderá exigir reaceite prévio, sem que isso configure alteração unilateral indevida.</p>
<p>14.4. Alterações substanciais serão comunicadas com <strong>30 (trinta) dias de antecedência</strong> via e-mail cadastrado.</p>
<hr>
<h2>15. Propriedade Intelectual</h2>
<p>15.1. Todos os direitos de propriedade intelectual sobre o sistema RAFA ILPI, incluindo códigos-fonte, interfaces, logotipos, marcas e documentação, são de <strong>titularidade exclusiva da Contratada</strong>.</p>
<p>15.2. Este contrato <strong>não transfere</strong> qualquer direito de propriedade intelectual à Contratante, concedendo apenas <strong>licença de uso</strong> não exclusiva, intransferível e limitada à vigência do contrato.</p>
<p>15.3. É <strong>vedado à Contratante</strong>:</p>
<ul>
<li>Copiar, reproduzir, modificar ou criar obras derivadas do sistema</li>
<li>Realizar engenharia reversa, descompilação ou desassembly</li>
<li>Sublicenciar, vender, alugar ou ceder acesso a terceiros</li>
</ul>
<hr>
<h2>16. Confidencialidade</h2>
<p>16.1. As partes se comprometem a manter sigilo sobre <strong>informações confidenciais</strong> trocadas durante a execução do contrato.</p>
<p>16.2. <strong>Não se consideram confidenciais</strong> informações:</p>
<ul>
<li>Já públicas ou de domínio público</li>
<li>Obtidas legitimamente de terceiros</li>
<li>Desenvolvidas independentemente sem uso de informação confidencial</li>
<li>Divulgadas por ordem judicial ou requisição legal</li>
</ul>
<p>16.3. A obrigação de confidencialidade permanece válida por <strong>5 (cinco) anos</strong> após o término do contrato.</p>
<hr>
<h2>17. Caso Fortuito e Força Maior</h2>
<p>17.1. Nenhuma das partes será responsabilizada por inadimplemento decorrente de <strong>caso fortuito ou força maior</strong>, incluindo:</p>
<ul>
<li>Desastres naturais (enchentes, incêndios, terremotos)</li>
<li>Atos governamentais, guerra, greves, lockouts</li>
<li>Falhas de infraestrutura de terceiros (provedores de internet, energia, data centers)</li>
<li>Ataques cibernéticos em larga escala (DDoS, ransomware)</li>
</ul>
<p>17.2. A parte afetada deverá comunicar a outra <strong>imediatamente</strong>, descrevendo o evento e as medidas tomadas para mitigação.</p>
<p>17.3. Caso o evento perdure por mais de <strong>30 (trinta) dias</strong>, qualquer das partes poderá rescindir o contrato sem ônus.</p>
<hr>
<h2>18. Aceite Eletrônico e Validade Jurídica</h2>
<p>18.1. Ao clicar em <strong>"Aceitar"</strong>, o responsável identificado neste instrumento declara que leu, compreendeu e concorda integralmente com os termos deste contrato, em nome da Contratante.</p>
<p>18.2. O aceite eletrônico realizado no ambiente do sistema possui <strong>plena validade jurídica</strong> e será registrado com:</p>
<ul>
<li>Data e hora do aceite (timestamp)</li>
<li>Identificação completa do responsável e da Contratante</li>
<li>Endereço IP de origem</li>
<li>Hash SHA-256 do conteúdo do contrato aceito</li>
<li>Versão do contrato</li>
</ul>
<p>18.3. O registro do aceite constitui <strong>prova documental</strong> para todos os efeitos legais.</p>
<hr>
<h2>19. Disposições Gerais</h2>
<p>19.1. Este contrato substitui e cancela <strong>todos os acordos, propostas e comunicações anteriores</strong>, verbais ou escritos, entre as partes sobre o objeto aqui tratado.</p>
<p>19.2. A invalidade ou inexequibilidade de qualquer cláusula <strong>não afetará</strong> a validade das demais, que permanecerão em pleno vigor.</p>
<p>19.3. A tolerância de uma parte quanto ao descumprimento de qualquer obrigação pela outra <strong>não constituirá novação ou renúncia</strong> de direitos, podendo ser exigida a qualquer tempo.</p>
<p>19.4. Este contrato <strong>não estabelece</strong> relação de sociedade, joint venture, mandato ou vínculo empregatício entre as partes.</p>
<p>19.5. <strong>Cessão:</strong> Nenhuma das partes poderá ceder ou transferir este contrato a terceiros sem anuência prévia e escrita da outra parte.</p>
<hr>
<h2>20. Foro e Lei Aplicável</h2>
<p>20.1. Este contrato é regido pelas <strong>leis da República Federativa do Brasil</strong>, especialmente:</p>
<ul>
<li>Lei nº 13.709/2018 (LGPD - Lei Geral de Proteção de Dados)</li>
<li>Lei nº 10.406/2002 (Código Civil)</li>
<li>RDC 502/2021 ANVISA (Regulamento Técnico para ILPIs)</li>
<li>Resolução CFM 1.821/2007 (Prontuário Eletrônico)</li>
</ul>
<p>20.2. Fica eleito o <strong>foro da comarca de Campinas</strong>, Estado de São Paulo, para dirimir quaisquer controvérsias decorrentes deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>
<p>20.3. As partes poderão, de comum acordo, submeter eventuais litígios à <strong>mediação ou arbitragem</strong> antes de recorrer ao Poder Judiciário.</p>
<hr>
<h2>Identificação para fins de registro do aceite</h2>
<p><strong>Pessoa Jurídica (Contratante):</strong></p>
<p><strong>Nome:</strong> {{tenant.name}}<br>
<strong>CNPJ:</strong> {{tenant.cnpj}}<br>
<strong>E-mail:</strong> {{tenant.email}}</p>
<hr>
<p><strong>Pessoa Física (Responsável pelo aceite):</strong></p>
<p><strong>Nome:</strong> {{user.name}}<br>
<strong>CPF:</strong> {{user.cpf}}<br>
<strong>E-mail:</strong> {{user.email}}</p>
<hr>
<p><strong>Data do aceite:</strong> {{today}}</p>
<hr>
<p><strong>Versão do contrato:</strong> 2.0<br>
<strong>Hash SHA-256:</strong> [gerado automaticamente pelo sistema no momento do aceite]</p>
<hr>
<p><em>Este contrato foi elaborado em conformidade com a Lei nº 13.709/2018 (LGPD), Código Civil, RDC 502/2021 ANVISA e Resolução CFM 1.821/2007.</em></p>`

export function ContractNew() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('Contrato de Prestação de Serviços – Plataforma RAFA ILPI')
  const [content, setContent] = useState(DEFAULT_CONTRACT_TEMPLATE)
  const [planId, setPlanId] = useState<string>('ALL')
  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)

  const createContract = useCreateContract()

  // Carregar planos ao montar componente
  useEffect(() => {
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
            <h1 className="text-3xl font-bold">Criar Novo Contrato</h1>
            <p className="text-muted-foreground">Preencha os campos para criar um contrato DRAFT</p>
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
          </div>

          <div className="mt-4 p-3 bg-primary/5 border border-primary/30 rounded-lg">
            <p className="text-xs text-primary/95">
              <strong>ℹ️ Versionamento automático:</strong> A versão será gerada automaticamente ao criar o contrato.
              {planId === 'ALL'
                ? ' Próxima versão do contrato genérico.'
                : ' Próxima versão para o plano selecionado.'}
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-lg mb-3">Conteúdo do Contrato</h3>
            <Card className="p-4 bg-primary/5 border-primary/30">
              <p className="text-xs font-semibold text-primary/95 mb-2">
                📝 Variáveis disponíveis para usar no contrato:
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
            {createContract.isPending ? 'Criando...' : 'Criar Contrato'}
          </Button>
        </div>
      </form>
    </div>
  )
}
