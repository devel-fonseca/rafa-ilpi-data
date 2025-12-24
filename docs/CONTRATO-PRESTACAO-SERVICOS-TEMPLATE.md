# Contrato de Prestação de Serviços – Plataforma RAFA ILPI

**Versão:** 2.0
**Data de Vigência:** 24/12/2025
**Última Atualização:** 24/12/2025

---

**TEMPLATE PARA SUPERADMIN**

Este documento é um **template** que será preenchido automaticamente com variáveis dinâmicas no momento do aceite eletrônico durante o onboarding.

**Variáveis disponíveis:**
- `{{tenant.name}}`, `{{tenant.cnpj}}`, `{{tenant.email}}`
- `{{user.name}}`, `{{user.cpf}}`, `{{user.email}}`
- `{{plan.name}}`, `{{plan.displayName}}`, `{{plan.price}}`, `{{plan.maxUsers}}`, `{{plan.maxResidents}}`
- `{{trial.days}}`
- `{{today}}`

---

## Contrato de Prestação de Serviços – Plataforma RAFA ILPI

**Plano contratado:** {{plan.displayName}} (`{{plan.name}}`)
**Data:** {{today}}

---

## 1. Identificação das Partes

**CONTRATADA:**

**RAFA LABS DESENVOLVIMENTO E TECNOLOGIA I.S.**
CNPJ nº **63.409.303/0001-82**
E-mails institucionais:
- Contato: contato@rafalabs.com.br
- Financeiro: financeiro@rafalabs.com.br
- Suporte: suporte@rafalabs.com.br

---

**CONTRATANTE (Pessoa Jurídica):**

**Nome:** {{tenant.name}}
**CNPJ:** {{tenant.cnpj}}
**E-mail de contato:** {{tenant.email}}

---

**RESPONSÁVEL PELA CONTRATAÇÃO / REPRESENTANTE NO ACEITE (Pessoa Física):**

**Nome:** {{user.name}}
**CPF:** {{user.cpf}}
**E-mail:** {{user.email}}

*O responsável identificado acima declara, no momento do aceite, possuir poderes para representar a Contratante e assumir as obrigações deste contrato.*

---

## 2. Objeto

2.1. O presente contrato tem por objeto a disponibilização do sistema **RAFA ILPI**, plataforma digital destinada ao apoio à gestão administrativa, operacional e documental de Instituições de Longa Permanência para Idosos (ILPIs), na modalidade **Software as a Service (SaaS)**.

2.2. O sistema constitui **ferramenta de apoio** à organização e ao registro de informações, **não substituindo obrigações legais, regulatórias, técnicas, administrativas ou assistenciais** da Contratante.

2.3. A Contratada **não realiza avaliação clínica, diagnóstico, prescrição ou tomada de decisão em saúde**, limitando-se a fornecer infraestrutura tecnológica para registro e organização de informações pela Contratante e seus profissionais autorizados.

---

## 3. Plano Contratado, Limites e Preço

3.1. A Contratante adere ao plano **{{plan.displayName}}** (`{{plan.name}}`), pelo valor de **{{plan.price}}**, cobrado de forma recorrente conforme periodicidade definida no momento da contratação.

3.2. O plano contratado contempla os seguintes **limites operacionais**:

- **Máximo de usuários:** {{plan.maxUsers}}
- **Máximo de residentes:** {{plan.maxResidents}}

3.3. Caso aplicável, a Contratante poderá usufruir de **período de teste (trial)** de **{{trial.days}} dias**. Encerrado o período de trial, a cobrança será iniciada automaticamente, salvo cancelamento prévio.

3.4. A superação dos limites do plano poderá resultar em **bloqueio técnico** de novas inclusões, necessidade de migração de plano ou contratação adicional, sem que isso configure falha ou inadimplemento da Contratada.

---

## 4. Forma de Pagamento e Vencimento

4.1. O pagamento será realizado de forma **recorrente e automática**, conforme periodicidade escolhida pela Contratante:

- **Mensal:** Vencimento no mesmo dia do mês da contratação
- **Anual:** Vencimento no mesmo mês/dia da contratação (com desconto quando aplicável)

4.2. **Formas de pagamento aceitas:**

- Boleto bancário (vencimento em até 5 dias úteis após emissão)
- PIX (pagamento instantâneo)
- Cartão de crédito (débito automático recorrente)

4.3. O processamento de pagamentos é realizado através de plataforma de pagamentos especializada, que garante segurança para dados financeiros.

4.4. A Contratada **não armazena** dados completos de cartão de crédito, apenas tokens criptografados fornecidos pelo processador de pagamentos.

---

## 5. Vigência, Cancelamento e Suspensão

5.1. O presente contrato entra em vigor na data do aceite eletrônico e vigora por **prazo indeterminado** enquanto houver assinatura ativa.

5.2. A Contratante poderá solicitar o **cancelamento a qualquer tempo**, produzindo efeitos ao final do período já pago.

### 5.3. Inadimplência e Suspensão

5.3.1. Em caso de inadimplência, o sistema exibirá **aviso de cobrança pendente** a todos os usuários da Contratante.

5.3.2. Após **5 (cinco) dias corridos** de atraso, o acesso ao sistema será **suspenso temporariamente** (modo somente leitura).

5.3.3. Após **15 (quinze) dias corridos** de atraso, o acesso será **bloqueado totalmente**, sem prejuízo da cobrança dos valores devidos.

5.3.4. O acesso será restaurado em até **24 horas** após confirmação do pagamento.

5.3.5. A suspensão por inadimplência **não implica exclusão de dados**, que permanecerão armazenados por até **90 (noventa) dias** após o bloqueio.

### 5.4. Cancelamento e Exclusão de Dados

5.4.1. Após o cancelamento do contrato, a Contratante terá **90 (noventa) dias** para exportar dados completos do sistema.

5.4.2. Decorrido o prazo de 90 dias, os dados administrativos serão excluídos permanentemente.

5.4.3. A Contratada **disponibiliza meios técnicos** para que a Contratante cumpra seus deveres legais de guarda de prontuários eletrônicos (Resolução CFM 1.821/2007 – mínimo de 20 anos), mantendo os dados clínicos armazenados pelo prazo que a Contratante determinar, observada a legislação aplicável.

---

## 6. Migração de Plano (Upgrade/Downgrade)

6.1. A Contratante poderá solicitar **upgrade de plano** a qualquer momento, com aplicação imediata e cobrança proporcional (pro rata) no período vigente.

6.2. A Contratante poderá solicitar **downgrade de plano**, com efeito a partir da próxima renovação (evitando cobranças retroativas).

6.3. **Limitações no downgrade:**

- Se a Contratante possui mais usuários ou residentes que o limite do novo plano, o downgrade será **bloqueado tecnicamente** até adequação
- A Contratante deverá inativar usuários/residentes excedentes antes de confirmar o downgrade

6.4. Migração de plano pode exigir **reaceite de contrato** caso haja alteração substancial de termos.

---

## 7. Acesso, Disponibilidade e Atualizações

7.1. O acesso ao sistema é **remoto, não exclusivo** e condicionado à disponibilidade técnica.

7.2. A Contratada **envidará seus melhores esforços técnicos e operacionais** para manter a disponibilidade do sistema, **sem garantia de disponibilidade contínua ou ininterrupta**.

7.3. O sistema poderá sofrer **interrupções pontuais** para manutenção, atualização, correções de segurança ou adequações legais, preferencialmente em horários de menor impacto.

7.4. A Contratada poderá, a seu critério, modificar interfaces, fluxos e funcionalidades, desde que preservada a finalidade essencial do serviço e **não inviabilize o uso regular do sistema** ou descaracterize sua finalidade principal.

7.5. **Não se caracteriza falha na prestação do serviço** a indisponibilidade decorrente de fatores externos, tais como falhas de internet, energia elétrica, dispositivos da Contratante ou serviços de terceiros.

---

## 8. Suporte Técnico

8.1. O suporte técnico será prestado por **e-mail e WhatsApp comercial**, em regime de **melhores esforços**, sem garantia de prazo específico para resposta ou resolução.

8.2. **Canais de suporte:**

- E-mail: suporte@rafalabs.com.br
- WhatsApp: (19) 98152-4849

8.3. **Horário de atendimento:**

- Segunda a Sexta: 9h às 18h (horário de Brasília)
- Sábados, Domingos e Feriados: Apenas emergências críticas **a critério exclusivo da Contratada** (via e-mail)

8.4. A Contratada priorizará atendimento de incidentes críticos que afetem disponibilidade total do sistema, sem garantia de tempo de resolução.

---

## 9. Backup e Recuperação de Dados

9.1. A Contratada adota **rotinas regulares de backup** e procedimentos de recuperação **compatíveis com boas práticas de mercado**, sem garantia de prazo específico para restauração.

9.2. A Contratante pode solicitar **exportação manual de dados** a qualquer momento, nos formatos:

- PDF (prontuários e relatórios)
- JSON (dados estruturados - portabilidade LGPD)
- CSV (planilhas para análise externa)

9.3. **Não há garantia absoluta de recuperação total** em cenários excepcionais (falha catastrófica, perda de dados ou corrompimento de backups), sendo a Contratada responsável por empregar seus **melhores esforços técnicos** para minimizar perdas e restabelecer o acesso aos dados.

---

## 10. Obrigações e Responsabilidades da Contratante

10.1. Utilizar o sistema de forma **lícita, ética e conforme a legislação vigente**.

10.2. Garantir que possui **autorização legal, ética e regulatória** para inserir, tratar e armazenar os dados cadastrados no sistema.

10.3. Manter **controle sobre usuários, perfis de acesso e credenciais**.

10.4. Assumir **integral responsabilidade** pelas informações inseridas, atualizadas ou omitidas no sistema.

10.5. **Obter consentimento** de responsáveis legais dos residentes para tratamento de dados de saúde, quando exigido pela legislação.

10.6. Cumprir obrigações da **RDC 502/2021 ANVISA** e demais regulamentações aplicáveis a ILPIs.

---

## 11. Dados Pessoais, Dados Sensíveis e LGPD

11.1. A Contratada realizará o tratamento de dados pessoais exclusivamente nos **limites necessários à execução deste contrato**, observando a **Lei nº 13.709/2018 (LGPD)**.

11.2. A Contratante declara-se **controladora dos dados** inseridos no sistema, incluindo dados pessoais e **dados pessoais sensíveis** (dados de saúde), assumindo integral responsabilidade por sua **base legal, finalidade, conteúdo, veracidade e atualização**.

11.3. A Contratada atuará, para fins da LGPD, na condição de **operadora de dados**, realizando o tratamento conforme as instruções da Contratante e as funcionalidades disponibilizadas no sistema.

11.4. O sistema RAFA ILPI poderá armazenar **dados sensíveis relacionados à saúde** dos residentes, tais como informações clínicas, registros assistenciais, prescrições, evoluções multiprofissionais e dados correlatos, os quais são inseridos, geridos e utilizados exclusivamente pela Contratante e seus usuários autorizados.

11.5. A Contratada **não realiza avaliação clínica, diagnóstico, prescrição, validação assistencial ou tomada de decisão em saúde**, limitando-se a fornecer infraestrutura tecnológica para registro e organização das informações.

11.6. A Contratante declara que possui **autorização legal, ética e regulatória** para coletar, registrar e tratar os dados sensíveis de saúde inseridos no sistema, inclusive consentimento do titular quando exigido, ou outra base legal aplicável.

11.7. A Contratada adota **medidas técnicas e organizacionais adequadas**, compatíveis com o estado da técnica e com a natureza dos dados tratados, para proteção dos dados contra acessos não autorizados, perdas ou incidentes de segurança.

11.8. **Política de Privacidade:** A Contratante declara ter lido e concordado com a **Política de Privacidade** da plataforma, disponível em [https://rafalabs.com.br/politica-de-privacidade](https://rafalabs.com.br/politica-de-privacidade), que integra o presente contrato para todos os efeitos legais.

### 11.9. Suboperadores de Dados

11.9.1. A Contratada poderá utilizar **terceiros para suporte à infraestrutura** (hospedagem, armazenamento, processamento de pagamentos), desde que observados **padrões de segurança e confidencialidade equivalentes**.

11.9.2. Todos os suboperadores são contratualmente obrigados a **observar os requisitos do art. 33 da LGPD** para tratamento e transferência internacional de dados pessoais.

11.9.3. A Contratada notificará a Contratante sobre alteração de suboperadores críticos com **30 (trinta) dias de antecedência**, permitindo eventual oposição justificada.

### 11.10. Incidentes de Segurança

11.10.1. Em caso de incidente de segurança envolvendo acesso não autorizado, vazamento ou perda de dados pessoais, a Contratada compromete-se a comunicar a Contratante **em prazo razoável**, após confirmação da ocorrência e avaliação de impacto.

11.10.2. A notificação conterá, no mínimo:

- Descrição da natureza do incidente
- Tipos de dados potencialmente afetados
- Número estimado de residentes/usuários impactados
- Medidas técnicas já adotadas para mitigação
- Recomendações de ações para a Contratante

11.10.3. A **responsabilidade de comunicar responsáveis legais e titulares afetados** é da Contratante (na condição de Controladora), com suporte técnico da Contratada quando solicitado.

### 11.11. Propriedade dos Dados

11.11.1. Todos os dados inseridos, armazenados ou processados no sistema são de **propriedade exclusiva da Contratante**.

11.11.2. A Contratada **NÃO** utiliza, compartilha, vende ou transfere dados da Contratante para:

- Treinamento de modelos de inteligência artificial
- Análises estatísticas agregadas (mesmo anonimizadas) sem consentimento prévio
- Marketing ou prospecção comercial
- Terceiros não autorizados

11.11.3. A Contratada poderá acessar dados da Contratante **apenas** para:

- Suporte técnico (mediante solicitação e autorização da Contratante)
- Correção de bugs críticos (com notificação posterior)
- Cumprimento de ordem judicial

11.11.4. Todo acesso da Contratada aos dados é **registrado em log de auditoria** com identificação do profissional, data/hora e justificativa.

---

## 12. Auditoria e Conformidade

12.1. A Contratada fornecerá, mediante solicitação formal da Contratante, **relatório declaratório de conformidade LGPD** contendo evidências das medidas técnicas e organizacionais de proteção de dados.

12.2. **Não será permitida auditoria técnica presencial ou remota** em sistemas da Contratada, em razão de:

- Natureza multi-tenant (isolamento de dados de outros clientes)
- Segredos comerciais e industriais
- Risco de exposição indireta de dados de terceiros

12.3. A Contratada poderá fornecer **documentos genéricos** (certificados, relatórios de segurança, políticas internas) que demonstrem conformidade, sem acesso direto a sistemas ou infraestrutura.

---

## 13. Limitação de Responsabilidade

13.1. O RAFA ILPI constitui **ferramenta de apoio** à gestão, **não substituindo controles internos, profissionais habilitados ou obrigações legais** da Contratante.

13.2. A Contratada **não será responsável** por:

- Danos indiretos, lucros cessantes, perda de chance ou expectativas de resultado
- Decisões tomadas com base nas informações registradas no sistema
- Erros ou omissões nas informações inseridas pela Contratante
- Indisponibilidade decorrente de fatores externos (internet, energia, dispositivos)
- Perda de dados por uso inadequado, falha de backup externo ou força maior

13.3. Em nenhuma hipótese a responsabilidade da Contratada excederá o **valor efetivamente pago pela Contratante nos últimos 12 (doze) meses** de contrato.

---

## 14. Atualizações Contratuais e Reaceite

14.1. A Contratada poderá publicar novas versões deste contrato para atualização legal, técnica, comercial ou operacional.

14.2. Quando aplicável, o sistema poderá exigir **novo aceite eletrônico** como condição para continuidade do uso.

14.3. A migração para plano vinculado a condições contratuais distintas poderá exigir reaceite prévio, sem que isso configure alteração unilateral indevida.

14.4. Alterações substanciais serão comunicadas com **30 (trinta) dias de antecedência** via e-mail cadastrado.

---

## 15. Propriedade Intelectual

15.1. Todos os direitos de propriedade intelectual sobre o sistema RAFA ILPI, incluindo códigos-fonte, interfaces, logotipos, marcas e documentação, são de **titularidade exclusiva da Contratada**.

15.2. Este contrato **não transfere** qualquer direito de propriedade intelectual à Contratante, concedendo apenas **licença de uso** não exclusiva, intransferível e limitada à vigência do contrato.

15.3. É **vedado à Contratante**:

- Copiar, reproduzir, modificar ou criar obras derivadas do sistema
- Realizar engenharia reversa, descompilação ou desassembly
- Sublicenciar, vender, alugar ou ceder acesso a terceiros

---

## 16. Confidencialidade

16.1. As partes se comprometem a manter sigilo sobre **informações confidenciais** trocadas durante a execução do contrato.

16.2. **Não se consideram confidenciais** informações:

- Já públicas ou de domínio público
- Obtidas legitimamente de terceiros
- Desenvolvidas independentemente sem uso de informação confidencial
- Divulgadas por ordem judicial ou requisição legal

16.3. A obrigação de confidencialidade permanece válida por **5 (cinco) anos** após o término do contrato.

---

## 17. Caso Fortuito e Força Maior

17.1. Nenhuma das partes será responsabilizada por inadimplemento decorrente de **caso fortuito ou força maior**, incluindo:

- Desastres naturais (enchentes, incêndios, terremotos)
- Atos governamentais, guerra, greves, lockouts
- Falhas de infraestrutura de terceiros (provedores de internet, energia, data centers)
- Ataques cibernéticos em larga escala (DDoS, ransomware)

17.2. A parte afetada deverá comunicar a outra **imediatamente**, descrevendo o evento e as medidas tomadas para mitigação.

17.3. Caso o evento perdure por mais de **30 (trinta) dias**, qualquer das partes poderá rescindir o contrato sem ônus.

---

## 18. Aceite Eletrônico e Validade Jurídica

18.1. Ao clicar em **"Aceitar"**, o responsável identificado neste instrumento declara que leu, compreendeu e concorda integralmente com os termos deste contrato, em nome da Contratante.

18.2. O aceite eletrônico realizado no ambiente do sistema possui **plena validade jurídica** e será registrado com:

- Data e hora do aceite (timestamp)
- Identificação completa do responsável e da Contratante
- Endereço IP de origem
- Hash SHA-256 do conteúdo do contrato aceito
- Versão do contrato

18.3. O registro do aceite constitui **prova documental** para todos os efeitos legais.

---

## 19. Disposições Gerais

19.1. Este contrato substitui e cancela **todos os acordos, propostas e comunicações anteriores**, verbais ou escritos, entre as partes sobre o objeto aqui tratado.

19.2. A invalidade ou inexequibilidade de qualquer cláusula **não afetará** a validade das demais, que permanecerão em pleno vigor.

19.3. A tolerância de uma parte quanto ao descumprimento de qualquer obrigação pela outra **não constituirá novação ou renúncia** de direitos, podendo ser exigida a qualquer tempo.

19.4. Este contrato **não estabelece** relação de sociedade, joint venture, mandato ou vínculo empregatício entre as partes.

19.5. **Cessão:** Nenhuma das partes poderá ceder ou transferir este contrato a terceiros sem anuência prévia e escrita da outra parte.

---

## 20. Foro e Lei Aplicável

20.1. Este contrato é regido pelas **leis da República Federativa do Brasil**, especialmente:

- Lei nº 13.709/2018 (LGPD - Lei Geral de Proteção de Dados)
- Lei nº 10.406/2002 (Código Civil)
- RDC 502/2021 ANVISA (Regulamento Técnico para ILPIs)
- Resolução CFM 1.821/2007 (Prontuário Eletrônico)

20.2. Fica eleito o **foro da comarca de Campinas**, Estado de São Paulo, para dirimir quaisquer controvérsias decorrentes deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

20.3. As partes poderão, de comum acordo, submeter eventuais litígios à **mediação ou arbitragem** antes de recorrer ao Poder Judiciário.

---

## Identificação para fins de registro do aceite

**Pessoa Jurídica (Contratante):**

**Nome:** {{tenant.name}}
**CNPJ:** {{tenant.cnpj}}
**E-mail:** {{tenant.email}}

---

**Pessoa Física (Responsável pelo aceite):**

**Nome:** {{user.name}}
**CPF:** {{user.cpf}}
**E-mail:** {{user.email}}

---

**Data do aceite:** {{today}}

---

**Versão do contrato:** 2.0
**Hash SHA-256:** [gerado automaticamente pelo sistema no momento do aceite]

---

*Este contrato foi elaborado em conformidade com a Lei nº 13.709/2018 (LGPD), Código Civil, RDC 502/2021 ANVISA e Resolução CFM 1.821/2007.*
