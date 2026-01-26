# TERMO DE ACEITE E TERMOS DE USO – PLATAFORMA RAFA ILPI (SaaS)

**Versão:** 1.0  
**Data de Vigência:** 05/01/2026
**Última Atualização:** 05/01/2026  

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

## TERMO DE ACEITE E TERMOS DE USO – PLATAFORMA RAFA ILPI

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

**RESPONSÁVEL PELO ACEITE / REPRESENTANTE (Pessoa Física):**

**Nome:** {{user.name}}  
**CPF:** {{user.cpf}}  
**E-mail:** {{user.email}}  

*O responsável identificado acima declara, no momento do aceite, possuir poderes para representar a Contratante e assumir as obrigações deste Termo.*

---

## 2. Objeto e Natureza do Serviço (SaaS)

2.1. Este Termo regula o acesso e o uso da plataforma **RAFA ILPI**, solução digital destinada ao apoio à gestão administrativa, operacional e documental de Instituições de Longa Permanência para Idosos (ILPIs), na modalidade **Software as a Service (SaaS)**.

2.2. A Contratada concede à Contratante uma **licença de uso** do sistema, **não exclusiva, intransferível, revogável e limitada** ao período de assinatura ativa e às condições deste Termo.

2.3. O sistema constitui **ferramenta de apoio** à organização e ao registro de informações, **não substituindo obrigações legais, regulatórias, técnicas, administrativas ou assistenciais** da Contratante.

2.4. A Contratada **não realiza avaliação clínica, diagnóstico, prescrição, validação assistencial ou tomada de decisão em saúde**, limitando-se a fornecer infraestrutura tecnológica para registro e organização de informações pela Contratante e seus profissionais autorizados.

2.5. **Aviso de uso e responsabilidade.** A Contratante declara ciência de que o RAFA ILPI é ferramenta de apoio e organização, não substitui rotinas internas, profissionais habilitados, protocolos assistenciais e obrigações legais e regulatórias. A Contratante permanece integralmente responsável por validar, revisar e executar as decisões e condutas adotadas com base nas informações registradas no sistema.

---

## 3. Plano Contratado, Limites e Preço

3.1. A Contratante adere ao plano **{{plan.displayName}}** (`{{plan.name}}`), pelo valor de **{{plan.price}}**, cobrado de forma recorrente conforme periodicidade definida no momento da contratação.

3.2. O plano contratado contempla os seguintes **limites operacionais**:

- **Máximo de usuários:** {{plan.maxUsers}}  
- **Máximo de residentes:** {{plan.maxResidents}}  

3.3. Caso aplicável, a Contratante poderá usufruir de **período de teste (trial)** de **{{trial.days}} dias**. Encerrado o período de trial, a cobrança será iniciada automaticamente, salvo cancelamento prévio.

3.4. A superação dos limites do plano poderá resultar em **bloqueio técnico** de novas inclusões, necessidade de migração de plano ou contratação adicional, sem que isso configure falha ou inadimplemento da Contratada.

---

## 4. Pagamento, Vencimento e Reajuste

4.1. O pagamento será realizado de forma **recorrente e automática**, conforme periodicidade escolhida pela Contratante:

- **Mensal:** vencimento no mesmo dia do mês da contratação  
- **Anual:** vencimento no mesmo mês/dia da contratação (com desconto quando aplicável)  

4.2. **Formas de pagamento aceitas:**
- Boleto bancário (vencimento em até 5 dias úteis após emissão)  
- PIX (pagamento instantâneo)  
- Cartão de crédito (débito automático recorrente)  

4.3. O processamento de pagamentos é realizado através de plataforma de pagamentos especializada.

4.4. A Contratada **não armazena** dados completos de cartão de crédito, apenas tokens fornecidos pelo processador de pagamentos.

### 4.5. Reajuste de preço

4.5.1. O valor da assinatura poderá ser reajustado **anualmente**, contado da data de início da assinatura ou do primeiro pagamento confirmado, com base na variação acumulada do **IPCA/IBGE**.

4.5.2. Na hipótese de extinção do índice indicado, será aplicado índice oficial que o substitua. Na ausência, poderá ser adotado índice equivalente, preservando o equilíbrio econômico da assinatura.

4.5.3. Além do reajuste anual, a Contratada poderá atualizar os valores em caso de **alteração relevante de custos operacionais**, tais como infraestrutura, tributos, meios de pagamento, serviços essenciais de terceiros ou exigências regulatórias que impactem diretamente a prestação do serviço.

4.5.4. A Contratante será comunicada com antecedência mínima de **30 (trinta) dias**, por e-mail cadastrado e/ou aviso no sistema.

4.5.5. A continuidade de uso após a vigência do reajuste será considerada **aceite do novo valor**, sem prejuízo do direito de cancelamento antes da renovação do ciclo de cobrança.

---

## 5. Vigência, Cancelamento e Suspensão

5.1. Este Termo entra em vigor na data do aceite eletrônico e vigora por **prazo indeterminado**, enquanto houver assinatura ativa.

5.2. A Contratante poderá solicitar o **cancelamento a qualquer tempo**, produzindo efeitos ao final do período já pago.

### 5.3. Inadimplência e suspensão

5.3.1. Em caso de inadimplência, o sistema poderá exibir **aviso de cobrança pendente** aos usuários da Contratante.

5.3.2. Após **5 (cinco) dias corridos** de atraso, o acesso poderá ser **suspenso temporariamente** (modo somente leitura).

5.3.3. Após **15 (quinze) dias corridos** de atraso, o acesso poderá ser **bloqueado totalmente**, sem prejuízo da cobrança dos valores devidos.

5.3.4. O acesso será restaurado em até **24 horas** após confirmação do pagamento.

5.3.5. A suspensão por inadimplência **não implica exclusão imediata de dados**, que permanecerão armazenados por até **90 (noventa) dias** após o bloqueio.

5.5. **Suspensão por segurança.** A Contratada poderá suspender temporariamente acessos ou funcionalidades, total ou parcialmente, caso identifique indícios razoáveis de risco à segurança, abuso, violação deste Termo, tentativa de acesso indevido ou incidente que comprometa a integridade da plataforma, comunicando a Contratante em prazo razoável.

### 5.4. Cancelamento e exclusão de dados

5.4.1. Após o cancelamento, a Contratante terá **90 (noventa) dias** para exportar dados completos do sistema.

5.4.2. Decorrido o prazo, os dados administrativos poderão ser excluídos permanentemente.

5.4.3. A Contratada disponibiliza meios técnicos para exportação e portabilidade, cabendo à Contratante cumprir seus deveres legais de guarda e arquivamento conforme a legislação aplicável.

---

## 6. Alteração de Planos, Recursos e Preços (Upgrade/Downgrade)

6.1. A Contratante poderá solicitar **upgrade de plano** a qualquer momento, com aplicação imediata e cobrança proporcional (**pro rata**) no período vigente.

6.2. A Contratante poderá solicitar **downgrade de plano**, com efeito a partir da próxima renovação.

6.3. O downgrade poderá ser bloqueado tecnicamente caso a Contratante possua quantidade de usuários, residentes ou consumo de recursos acima do limite do novo plano, cabendo à Contratante adequar previamente sua conta.

### 6.4. Alteração de planos e preços pela Contratada

6.4.1. A Contratada poderá, a seu critério, **criar, alterar, reorganizar, renomear, substituir, descontinuar ou reprecificar** planos, módulos, recursos, limites operacionais e funcionalidades da plataforma.

6.4.2. As alterações **não terão efeito retroativo** sobre valores já pagos, produzindo efeitos, quando aplicável, **a partir do próximo ciclo de cobrança**.

6.4.3. Em caso de alteração que impacte o preço ou limites do plano ativo, a Contratada comunicará a Contratante com antecedência mínima de **30 (trinta) dias**, por e-mail cadastrado e/ou aviso no sistema.

6.4.4. Caso a Contratante não concorde com as novas condições, poderá solicitar o cancelamento antes da renovação do ciclo de cobrança, mantendo o acesso até o final do período já pago.

6.4.5. A continuidade de uso após a vigência da alteração será considerada **aceite das novas condições**, sem prejuízo das regras de cancelamento previstas neste Termo.

---

## 7. Acesso, Disponibilidade e Atualizações

7.1. O acesso ao sistema é remoto, não exclusivo e depende de disponibilidade técnica.

7.2. A Contratada empregará **melhores esforços** para manter a plataforma disponível, **sem garantia de disponibilidade contínua ou ininterrupta**.

7.3. O sistema poderá sofrer interrupções pontuais para manutenção, atualização, correções de segurança ou adequações legais.

7.4. A Contratada poderá modificar interfaces, fluxos e funcionalidades, desde que preserve a finalidade essencial do serviço.

7.5. Não se caracteriza falha na prestação do serviço a indisponibilidade decorrente de fatores externos (internet, energia, dispositivos, serviços de terceiros).

7.6. **Alertas e notificações.** Caso o sistema disponibilize alertas, lembretes, avisos por e-mail, WhatsApp ou notificações internas, a Contratante reconhece que tais recursos possuem caráter auxiliar. A Contratada não garante entrega, leitura ou acionamento em tempo real, nem se responsabiliza por falhas decorrentes de configurações, filtros, indisponibilidade de terceiros ou desativação pelo usuário.

---

## 8. Suporte Técnico

8.1. O suporte será prestado por e-mail e WhatsApp comercial, em regime de melhores esforços.

8.2. **Canais de suporte:**
- E-mail: suporte@rafalabs.com.br  
- WhatsApp: (19) 98152-4849, a critério da Contratada (planos)

8.3. **Horário de atendimento:**
- Segunda a Sexta: 9h às 18h (horário de Brasília)  
- Sábados, Domingos e Feriados: apenas emergências críticas, a critério da Contratada (via e-mail)

8.4. A Contratada poderá priorizar incidentes críticos que afetem a disponibilidade total do sistema, sem garantia de tempo de resolução.

---

## 9. Backup e Recuperação de Dados

9.1. A Contratada adota rotinas regulares de backup compatíveis com boas práticas, sem garantia de prazo específico para restauração.

9.2. A Contratante poderá solicitar exportação manual de dados a qualquer momento, nos formatos:
- PDF  
- JSON  
- CSV  

9.3. Não há garantia absoluta de recuperação total em cenários excepcionais, cabendo à Contratada empregar melhores esforços para minimizar perdas e restabelecer o acesso.

---

## 10. Obrigações da Contratante e dos Usuários

10.1. Utilizar o sistema de forma lícita e conforme a legislação vigente.

10.2. Garantir autorização legal e regulatória para inserir, tratar e armazenar os dados cadastrados.

10.3. Manter controle sobre usuários, perfis de acesso e credenciais.

10.4. Assumir responsabilidade pelas informações inseridas, atualizadas ou omitidas no sistema.

10.5. Obter consentimento de responsáveis legais dos residentes quando exigido, ou adotar outra base legal aplicável.

10.6. Cumprir obrigações da RDC 502/2021 ANVISA e demais normas aplicáveis a ILPIs.

10.7. **Conferência e validação.** A Contratante compromete-se a manter rotinas internas de conferência e validação das informações registradas no sistema, incluindo, quando aplicável, registros clínicos, prescrições, sinais vitais, intercorrências, vacinações, escalas e documentos operacionais, reconhecendo que o uso do sistema não elimina a necessidade de revisão humana.

10.8. **Uso proibido.** É vedado à Contratante e seus usuários:  
a) utilizar o sistema para fins ilícitos ou em desconformidade com normas sanitárias, éticas e de proteção de dados;  
b) tentar acessar dados de terceiros ou burlar controles de acesso;  
c) inserir conteúdo malicioso (vírus, scripts, automações abusivas);  
d) praticar engenharia reversa, cópia ou exploração indevida da plataforma;  
e) revender, sublicenciar ou disponibilizar acesso a terceiros não autorizados.

---

## 11. Dados Pessoais, Dados Sensíveis e LGPD

11.1. A Contratada realizará tratamento de dados pessoais nos limites necessários à execução deste Termo, observando a Lei nº 13.709/2018 (LGPD).

11.2. A Contratante declara-se **Controladora** dos dados inseridos no sistema, incluindo dados pessoais e dados pessoais sensíveis (dados de saúde).

11.3. A Contratada atuará como **Operadora**, tratando dados conforme as instruções da Contratante e as funcionalidades disponibilizadas.

11.4. O RAFA ILPI poderá armazenar dados sensíveis de saúde inseridos e geridos exclusivamente pela Contratante e seus usuários autorizados.

11.5. A Contratada não realiza avaliação clínica, diagnóstico, prescrição ou validação assistencial.

11.6. A Contratante declara possuir autorização legal e regulatória para coletar e tratar dados sensíveis inseridos.

11.7. A Contratada adota medidas técnicas e organizacionais adequadas para proteção contra acessos não autorizados, perdas ou incidentes.

11.8. A Contratante declara ciência e concordância com a Política de Privacidade da plataforma, disponível em:  
https://rafalabs.com.br/politica-de-privacidade

### 11.9. Suboperadores

11.9.1. A Contratada poderá utilizar terceiros (hospedagem, armazenamento, pagamentos), com padrões equivalentes de segurança e confidencialidade.

11.9.2. A Contratada notificará alteração de suboperadores críticos com 30 dias de antecedência, quando aplicável.

### 11.10. Incidentes de segurança

11.10.1. A Contratada comunicará a Contratante em prazo razoável após confirmação e avaliação de impacto.

11.10.2. A Contratante permanece responsável por comunicações a titulares e responsáveis legais, quando cabíveis, com suporte técnico da Contratada quando solicitado.

### 11.11. Propriedade dos dados

11.11.1. Os dados inseridos no sistema são de propriedade da Contratante.

11.11.2. A Contratada não vende, transfere ou utiliza dados da Contratante para treinamento de IA, marketing ou terceiros não autorizados.

11.11.3. A Contratada poderá acessar dados apenas para suporte, correção de bugs críticos (com notificação posterior) ou cumprimento de ordem judicial.

11.11.4. Todo acesso será registrado em log de auditoria.

---

## 12. Auditoria e Conformidade

12.1. A Contratada poderá fornecer relatório declaratório de conformidade LGPD mediante solicitação.

12.2. Não será permitida auditoria técnica direta em sistemas da Contratada, em razão de multi-tenant, segredos comerciais e risco de exposição de terceiros.

12.3. A Contratada poderá fornecer documentos genéricos de conformidade, sem acesso direto à infraestrutura.

---

## 13. Limitação de Responsabilidade

13.1. O RAFA ILPI é ferramenta de apoio e não substitui controles internos, profissionais habilitados ou obrigações legais.

13.2. A Contratada não será responsável por danos indiretos, lucros cessantes, perda de chance, decisões tomadas com base nos dados, erros de cadastro, indisponibilidade externa ou força maior.

13.3. **Teto de responsabilidade.** Em qualquer hipótese, eventual responsabilidade da Contratada ficará limitada ao valor efetivamente pago pela Contratante nos **12 (doze) meses anteriores** ao evento que originou a reclamação, excluídos tributos, encargos de meios de pagamento e valores de terceiros, sem prejuízo das exclusões previstas neste Termo.

---

## 14. Atualizações deste Termo e Reaceite

14.1. A Contratada poderá publicar novas versões deste Termo para atualização legal, técnica, comercial ou operacional.

14.2. O sistema poderá exigir novo aceite eletrônico como condição de continuidade.

14.3. Alterações substanciais serão comunicadas com antecedência mínima de 30 dias.

---

## 15. Propriedade Intelectual

15.1. Todos os direitos de propriedade intelectual do RAFA ILPI pertencem exclusivamente à Contratada.

15.2. Este Termo não transfere direitos de propriedade, concedendo apenas licença de uso.

15.3. É vedado copiar, modificar, realizar engenharia reversa, sublicenciar ou ceder acesso a terceiros.

---

## 16. Confidencialidade

16.1. As partes manterão sigilo sobre informações confidenciais trocadas.

16.2. Exceções: informações públicas, obtidas de terceiros, desenvolvidas independentemente ou divulgadas por ordem judicial/legal.

16.3. A confidencialidade permanece por 5 anos após o término.

---

## 17. Caso Fortuito e Força Maior

17.1. Nenhuma parte será responsabilizada por eventos de caso fortuito ou força maior.

17.2. A parte afetada comunicará imediatamente a outra.

17.3. Persistindo por mais de 30 dias, qualquer parte poderá rescindir sem ônus.

---

## 18. Aceite Eletrônico e Validade Jurídica

18.1. Ao clicar em “Aceitar”, o responsável declara ciência e concordância integral com este Termo, em nome da Contratante.

18.2. O aceite eletrônico será registrado com:
- Data e hora (timestamp)  
- Identificação do responsável e da Contratante  
- IP de origem  
- Hash SHA-256 do conteúdo aceito  
- Versão do Termo  

18.3. O registro constitui prova documental para todos os efeitos legais.

---

## 19. Disposições Gerais

19.1. Este Termo substitui acordos anteriores sobre o mesmo objeto.

19.2. A invalidade de cláusula não invalida as demais.

19.3. A tolerância não implica renúncia ou novação.

19.4. Este Termo não cria sociedade, mandato ou vínculo empregatício.

19.5. Cessão: nenhuma parte poderá ceder este Termo sem anuência prévia e escrita da outra.

---

## 20. Foro e Lei Aplicável

20.1. Aplica-se a legislação brasileira, especialmente:
- Lei nº 13.709/2018 (LGPD)  
- Lei nº 10.406/2002 (Código Civil)  
- RDC 502/2021 ANVISA  
- Resolução CFM 1.821/2007 (quando aplicável)  

20.2. Fica eleito o foro da comarca de **Campinas/SP**, com renúncia de qualquer outro.

20.3. As partes poderão buscar mediação ou arbitragem antes do Judiciário, por comum acordo.

---

## Identificação para fins de registro do aceite

**Pessoa Jurídica (Contratante):**  
Nome: {{tenant.name}}  
CNPJ: {{tenant.cnpj}}  
E-mail: {{tenant.email}}  

**Pessoa Física (Responsável pelo aceite):**  
Nome: {{user.name}}  
CPF: {{user.cpf}}  
E-mail: {{user.email}}  

**Data do aceite:** {{today}}  
**Versão:** 1.0  
**Hash SHA-256:** [gerado automaticamente pelo sistema no momento do aceite]
