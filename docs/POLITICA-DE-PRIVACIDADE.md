# Política de Privacidade - Sistema Rafa ILPI

**Versão:** 2.1
**Data de Vigência:** 24/12/2025
**Última Atualização:** 24/12/2025
**Responsável:** Rafa Labs Desenvolvimento e Tecnologia

---

## 📄 Resumo Executivo (Linguagem Simples)

### O que coletamos?
- **Dados da ILPI:** Nome, CNPJ, endereço, contatos
- **Dados dos profissionais:** Nome, CPF, email, registro profissional (CRM, COREN, etc.)
- **Dados dos residentes:** Nome, CPF, dados de saúde (alergias, medicações, exames, sinais vitais)
- **Dados de responsáveis legais:** Nome, CPF, contato (registrados pela ILPI)

### Por que coletamos?
- Para cuidar da saúde dos residentes (prontuário eletrônico)
- Para cumprir exigências da ANVISA (RDC 502/2021)
- Para gestão administrativa da ILPI

### Onde guardamos?
- **Servidores seguros no Brasil** (Hostinger KVM - São Paulo)
- **Com criptografia militar** (AES-256-GCM - impossível ler sem autorização)
- **Cada ILPI tem dados totalmente separados** (schemas PostgreSQL isolados)

### Quanto tempo guardamos?
- **Dados de saúde (prontuário):** 20 anos (exigência CFM 1.821/2007)
- **Dados administrativos:** 5 anos após término do contrato
- **Logs de auditoria:** 5 anos

### Seus direitos (Responsável Legal):
- ✅ **Ver dados** do residente (solicite à ILPI)
- ✅ **Corrigir dados** errados (solicite à ILPI)
- ✅ **Receber cópia** completa (portabilidade - solicite à ILPI)
- ❌ **Não pode apagar prontuário** (obrigação legal - CFM)

### Como exercer seus direitos?
📞 **Entre em contato com a ILPI** onde o residente está institucionalizado
📧 Dúvidas técnicas: **privacidade@rafalabs.com.br**

---

## 1. Introdução

Esta Política de Privacidade descreve como o **Sistema Rafa ILPI** coleta, usa, armazena e protege os dados pessoais processados por **Instituições de Longa Permanência para Idosos (ILPIs)** que contratam a plataforma.

O Sistema Rafa ILPI é uma plataforma **B2B (Business to Business)** de gestão de saúde desenvolvida pela **Rafa Labs Desenvolvimento e Tecnologia** em conformidade com:

- **LGPD** (Lei Geral de Proteção de Dados - Lei nº 13.709/2018)
- **RDC 502/2021 ANVISA** (Regulamento Técnico para ILPIs)
- **CFM 1.821/2007** (Prontuário Eletrônico do Paciente)
- **Lei nº 13.787/2018** (Digitalização de documentos médicos)

---

## 2. Definições

- **Titular dos Dados:** Pessoa física a quem os dados pessoais se referem (residente, responsável legal, profissional).
- **Controlador:** A **ILPI** (instituição) que contrata o Sistema Rafa ILPI e decide quais dados coletar.
- **Operador:** **Rafa Labs**, que processa dados em nome do Controlador (ILPI).
- **Dados Pessoais:** Informação relacionada a pessoa natural identificada ou identificável.
- **Dados Sensíveis:** Dados de saúde, biométricos, genéticos (Art. 5º, II da LGPD).
- **Tratamento:** Qualquer operação com dados (coleta, armazenamento, consulta, compartilhamento, exclusão).

---

## 3. Dados Coletados

### 3.1. Dados de Identificação do Residente

**Base Legal:** Art. 7º, I (consentimento obtido pela ILPI) + Art. 11, II, c (tutela da saúde)

- **Nome completo** (NÃO criptografado - necessário para busca e identificação)
- **CPF** (criptografado - AES-256-GCM)
- **RG** (criptografado - AES-256-GCM)
- **CNS - Cartão Nacional de Saúde** (criptografado - AES-256-GCM)
- **Data de nascimento**
- **Sexo biológico**
- **Gênero**
- **Raça/cor** (autodeclaração)
- **Estado civil**
- **Naturalidade**
- **Profissão**
- **Escolaridade**
- **Religião**

### 3.2. Dados do Responsável Legal

**Base Legal:** Art. 7º, I (consentimento obtido pela ILPI)

**IMPORTANTE:** Estes dados são **registrados pela ILPI** no sistema. Responsáveis legais **NÃO têm acesso direto** ao sistema.

- **Nome completo**
- **CPF** (criptografado - AES-256-GCM)
- **RG** (criptografado - AES-256-GCM)
- **Telefone**
- **E-mail**
- **Endereço**
- **Parentesco**

### 3.3. Dados de Saúde (Dados Sensíveis)

**Base Legal:** Art. 11, II, c (tutela da saúde em procedimento realizado por profissionais de saúde)

#### Dados Criptografados (AES-256-GCM):
- **Alergias:** alérgeno, reação, observações (criptografado)
- **Condições Médicas:** nome da condição, CID-10, observações (criptografado)
- **Prescrições:** observações gerais (criptografado)
- **Medicações:** instruções de uso, observações (criptografado)
- **Evoluções Clínicas (SOAP):** subjetivo, objetivo, avaliação, plano (criptografado)
- **Registros Diários:** observações de enfermagem (criptografado)

#### Dados NÃO Criptografados (necessários para funcionalidades):

**Por que alguns dados de saúde NÃO são criptografados?**

**Justificativa Técnica:**
1. **Sinais Vitais** (PA, FC, glicemia):
   - Necessários para gráficos e alertas em tempo real
   - Análise de tendências (ex: "PA subindo nos últimos 7 dias")
   - Risco: Baixo (números isolados não identificam pessoa)

2. **Vacinações** (vacina, dose, lote):
   - Rastreamento de lotes (recall sanitário)
   - Relatórios para Vigilância Epidemiológica
   - Risco: Baixo (informação não identificatória)

**Decisão baseada em:**
- Princípio da **necessidade** (LGPD Art. 6º, III)
- Equilíbrio entre segurança e usabilidade clínica
- Dados altamente sensíveis (alergias, CID-10, evoluções) **SÃO criptografados**

**Dados não criptografados:**
- **Sinais Vitais:** PA, FC, temperatura, saturação O2, glicemia (valores numéricos)
- **Vacinações:** vacina aplicada, dose, lote, data de aplicação
- **Exames laboratoriais:** tipo, resultado, data
- **Perfil Clínico:** tipo sanguíneo, alergias (flag), marcapasso (flag)
- **Restrições Alimentares:** tipo de restrição, observações

### 3.4. Dados Administrativos

**Base Legal:** Art. 7º, I (consentimento) + Art. 7º, V (execução de contrato)

- **Data de admissão**
- **Data de alta/óbito**
- **Motivo da alta**
- **Tipo de acomodação**
- **Plano de saúde**
- **Situação cadastral** (ativo/inativo)

### 3.5. Dados de Profissionais de Saúde

**Base Legal:** Art. 7º, V (execução de contrato de trabalho)

- **Nome completo**
- **CPF**
- **E-mail**
- **Registro profissional** (CRM, COREN, CRF, CRN, etc.)
- **Cargo/função**
- **Especialidade**
- **Telefone**

### 3.6. Dados de Auditoria (Logs)

**Base Legal:** Art. 37 (necessidade de preservação de registros)

- **Histórico de alterações** em todos os registros (versionamento)
- **Usuário que realizou a ação**
- **Data e hora da operação**
- **Tipo de operação** (criação, atualização, exclusão lógica)
- **Dados anteriores e posteriores** (diff)
- **Justificativa de exclusão** (quando aplicável)

---

## 4. Finalidade do Tratamento

Os dados pessoais são tratados para as seguintes finalidades:

### 4.1. Assistência à Saúde
- Registro de prontuário eletrônico do residente
- Prescrição e administração de medicamentos
- Acompanhamento de sinais vitais
- Controle de alergias e condições médicas
- Evolução clínica e plano de cuidados
- Registro de procedimentos e exames

### 4.2. Gestão Administrativa
- Cadastro e controle de residentes
- Gestão de profissionais de saúde
- Controle de documentos institucionais (POPs, protocolos)
- Relatórios gerenciais

### 4.3. Conformidade Legal
- Cumprimento de obrigações regulatórias (RDC 502/2021 ANVISA)
- Auditoria de prontuários (CFM 1.821/2007)
- Rastreabilidade de ações (LGPD Art. 37)
- Evidência para fiscalizações sanitárias

### 4.4. Segurança e Prevenção
- Prevenção de erros médicos (alertas de alergias)
- Controle de interações medicamentosas
- Rastreamento de eventos adversos
- Auditoria de acesso e modificações

---

## 5. Base Legal para Tratamento de Dados

Conforme Art. 7º da LGPD, o tratamento de dados pessoais é realizado com base nas seguintes hipóteses:

| Tipo de Dado | Base Legal LGPD | Artigo |
|--------------|-----------------|--------|
| **Dados de Identificação** | Consentimento obtido pela ILPI | Art. 7º, I |
| **Dados de Saúde** | Tutela da saúde por profissionais da saúde | Art. 11, II, c |
| **Dados Administrativos** | Execução de contrato (serviço de institucionalização) | Art. 7º, V |
| **Dados de Profissionais** | Execução de contrato de trabalho | Art. 7º, V |
| **Logs de Auditoria** | Cumprimento de obrigação legal e regulatória | Art. 7º, II |

---

## 6. Divisão de Responsabilidades (LGPD)

### 6.1. Rafa Labs como OPERADORA (Art. 5º, VII)

**Responsabilidades:**
- ✅ Garantir segurança técnica (3 camadas de criptografia)
- ✅ Manter infraestrutura disponível (SLA por plano)
- ✅ Processar dados APENAS sob instrução da ILPI
- ✅ Notificar ILPI sobre incidentes de segurança (< 24h)
- ✅ Auxiliar ILPI a atender direitos dos titulares
- ✅ Eliminar dados ao fim do contrato (sob instrução da ILPI)

**NÃO responsável por:**
- ❌ Decisões sobre quais dados coletar (decisão da ILPI)
- ❌ Atender diretamente solicitações de responsáveis legais
- ❌ Validar consentimento de residentes (papel da ILPI)

### 6.2. ILPI como CONTROLADORA (Art. 5º, VI)

**Responsabilidades:**
- ✅ Decidir quais dados coletar e por quê
- ✅ Obter consentimento de responsáveis legais (quando aplicável)
- ✅ Atender solicitações de acesso, correção, portabilidade
- ✅ Definir políticas de retenção de dados
- ✅ Comunicar titulares sobre uso de seus dados
- ✅ Designar DPO próprio
- ✅ Treinar equipe sobre proteção de dados

**Exemplo prático:**
- Responsável legal quer cópia do prontuário → **ILPI atende**
- Sistema teve falha de segurança → **Rafa Labs notifica ILPI** → **ILPI notifica responsáveis legais**

---

## 7. Compartilhamento de Dados

### 7.1. Com Terceiros

O Sistema Rafa ILPI **NÃO compartilha dados** com terceiros, exceto nas seguintes situações:

#### Compartilhamento Autorizado (Suboperadores):
- **Hostinger KVM:** Hospedagem do servidor de aplicação e banco de dados (localizado em São Paulo, Brasil)
- **MinIO:** Armazenamento criptografado de arquivos (PDFs, imagens, documentos)
- **Cloudflare:** CDN e proteção DDoS (camada de transporte - HTTPS/TLS)
- **Asaas:** Processamento de pagamentos (dados financeiros - PCI-DSS compliant)

**Garantias:**
- Todos os suboperadores mantêm dados **em território brasileiro** (LGPD Art. 33)
- Todos implementam **criptografia em repouso** (AES-256)
- Contratos obrigam conformidade com LGPD

#### Compartilhamento Legal:
- **Autoridades de Saúde:** ANVISA, Vigilância Sanitária (em caso de fiscalização)
- **Autoridades Judiciais:** Mediante ordem judicial
- **ANPD (Autoridade Nacional de Proteção de Dados):** Mediante solicitação formal

### 7.2. Compartilhamento com Planos de Saúde

**Quando aplicável:**
- Envio de guias TISS (padrão ANS)
- Solicitação de autorizações prévias
- Faturamento de procedimentos

**Dados compartilhados:**
- Apenas dados clínicos necessários para autorização
- CID-10, procedimentos realizados, prescrições médicas

**Base Legal:**
- LGPD Art. 7º, V (execução de contrato de plano de saúde)
- Consentimento específico do responsável legal obtido pela ILPI

**Controle:**
- Responsável legal pode NEGAR compartilhamento (via ILPI)
- Consequência: Custos não cobertos pelo plano

### 7.3. Isolamento Multi-Tenant

Cada ILPI possui seu **próprio schema de banco de dados** isolado. Dados de uma instituição **NUNCA são acessíveis** por outra instituição.

**Isolamento Criptográfico:** Cada tenant possui chave de criptografia derivada única, garantindo que mesmo um vazamento de dados de um tenant não compromete outros.

---

## 8. Armazenamento e Segurança

### 8.1. Medidas Técnicas de Segurança (LGPD Art. 46)

O Sistema Rafa ILPI implementa **3 camadas de criptografia**:

#### **Camada 1: Transport Layer (HTTPS/TLS 1.3)**
- Criptografia em trânsito via HTTPS obrigatório
- Certificado SSL válido (Let's Encrypt/Cloudflare)
- HSTS (HTTP Strict Transport Security) habilitado

#### **Camada 2: Storage Layer (MinIO SSE)**
- Criptografia de arquivos em repouso (AES-256-GCM)
- Master Key gerenciada via MinIO KMS
- Arquivos PDF, imagens e documentos criptografados no disco

#### **Camada 3: Database Layer (Field-Level Encryption)**
- Criptografia de campos sensíveis no banco de dados
- Algoritmo: **AES-256-GCM** (authenticated encryption)
- KDF: **Scrypt** (N=16384) - resistente a ataques de força bruta
- **19 campos sensíveis criptografados** em 7 modelos:
  - Resident: CPF, RG, CNS, CPF/RG do responsável legal
  - Condition: nome da condição, CID-10, observações
  - Allergy: alérgeno, reação, observações
  - ClinicalNote: subjetivo, objetivo, avaliação, plano
  - Prescription: observações
  - Medication: instruções, observações
  - DailyRecord: notas de enfermagem

**Isolamento Criptográfico por Tenant:**
- Cada ILPI possui chave derivada única via Scrypt KDF
- Mesmo dado sensível gera ciphertexts completamente diferentes por tenant
- Comprometimento de um tenant NÃO afeta outros

### 8.2. Controle de Acesso (RBAC)

- **Autenticação:** JWT (JSON Web Token) com expiração de 8 horas
- **Autorização:** Role-Based Access Control (RBAC)
  - Admin (acesso total)
  - Médico/Enfermeiro (acesso a dados clínicos)
  - Cuidador (acesso a registros diários)
  - Administrativo (acesso a dados cadastrais)
- **Auditoria:** Logs de acesso e modificações (UserHistory, ResidentHistory, etc.)

### 8.3. Backup e Disaster Recovery

- **Backup automático diário** do banco de dados PostgreSQL
- **Retenção:** 30 dias
- **Backup criptografado** (AES-256)
- **Teste de restauração:** Mensal
- **RTO (Recovery Time Objective):** 4 horas
- **RPO (Recovery Point Objective):** 24 horas

### 8.4. Localização dos Dados

- **Servidor Principal:** Hostinger KVM (São Paulo, Brasil)
- **Backup:** Cloud Storage criptografado (região Brasil)
- **Dados NÃO são transferidos** para fora do Brasil (conformidade LGPD Art. 33)

---

## 9. Retenção de Dados

### 9.1. Dados Clínicos (Prontuário Eletrônico)

**Prazo:** **PERMANENTE** (20 anos mínimo, mas mantidos indefinidamente)

**Base Legal:**
- **CFM 1.821/2007:** Prontuário deve ser mantido por no mínimo 20 anos após último registro
- **Lei nº 13.787/2018:** Digitalização de prontuários (validade legal permanente)
- **RDC 502/2021 ANVISA Art. 33:** Registros de saúde devem ser mantidos por prazo legal

**Dados incluídos:**
- Alergias, condições médicas, prescrições, medicações
- Evoluções clínicas, registros diários, sinais vitais
- Exames, vacinações, procedimentos
- Histórico de versionamento (auditoria clínica)

### 9.2. Dados Administrativos

**Prazo:** **5 anos** após término do serviço (alta/óbito do residente ou cancelamento do contrato)

**Base Legal:**
- Código Civil Art. 206, §3º (prescrição de ações)
- LGPD Art. 16 (eliminação após fim da finalidade)

**Dados incluídos:**
- Dados cadastrais do residente e responsável legal
- Dados de admissão e alta
- Documentos administrativos

### 9.3. Dados de Profissionais

**Prazo:** **5 anos** após desligamento

**Base Legal:**
- CLT (Consolidação das Leis do Trabalho)
- LGPD Art. 16

### 9.4. Logs de Auditoria

**Prazo:** **5 anos** (alinhado com prazos legais de auditoria)

**Base Legal:**
- LGPD Art. 37 (evidência de conformidade)
- RDC 502/2021 ANVISA (rastreabilidade)

### 9.5. Dados Após Cancelamento do Contrato

**Prazo:** **90 dias** para exportação antes da exclusão

**Procedimento:**
1. ILPI cancela contrato
2. Sistema entra em modo somente leitura
3. ILPI tem 90 dias para exportar dados completos (JSON/PDF)
4. Após 90 dias, dados são excluídos permanentemente (exceto prontuários, mantidos por 20 anos)

---

## 10. Direitos do Titular dos Dados (Residente/Responsável Legal)

Conforme **LGPD Art. 18**, o titular tem direito a:

### 10.1. Como os Direitos São Exercidos

**IMPORTANTE:** Responsáveis legais e familiares **NÃO têm acesso direto** ao Sistema Rafa ILPI.

**Fluxo de Solicitação:**

1. **Responsável legal solicita à ILPI** (presencialmente, por e-mail ou telefone)
2. **ILPI avalia a solicitação** (coordenação/administração)
3. **ILPI atende via sistema** (gera relatório, corrige dados, etc.)
4. **ILPI entrega resposta** ao responsável legal

**Responsabilidade:**
- A **ILPI** é a **Controladora** dos dados (responsável legal perante LGPD)
- A **Rafa Labs** é a **Operadora** (processa dados sob instrução da ILPI)
- Solicitações devem ser dirigidas **à ILPI**, não à Rafa Labs

### 10.2. Confirmação e Acesso (Art. 18, I e II)

**O que:** Responsável legal pode solicitar confirmação de que dados estão sendo tratados e acessar dados do residente

**Como:**
1. Responsável legal solicita à ILPI (presencialmente ou por escrito)
2. ILPI valida identidade e vínculo legal
3. ILPI gera relatório via sistema (PDF completo ou por seção)
4. ILPI entrega ao responsável legal

**Prazo:** Até 15 dias úteis (LGPD Art. 19)

### 10.3. Correção (Art. 18, III)

**O que:** Corrigir dados incompletos, inexatos ou desatualizados

**Como:**
1. Responsável legal informa erro à ILPI
2. Profissional autorizado corrige no sistema
3. Sistema registra auditoria da correção
4. ILPI confirma correção ao responsável legal

### 10.4. Anonimização, Bloqueio ou Eliminação (Art. 18, IV)

**Anonimização:** Remoção de identificadores pessoais (nome, CPF, RG, CNS)
**Bloqueio:** Suspensão temporária de acesso aos dados
**Eliminação:** Exclusão de dados desnecessários ou tratados em desacordo com a LGPD

**Limitações:**
- Dados clínicos (prontuário) **NÃO podem ser eliminados** por obrigação legal (CFM 1.821/2007)
- Exclusão aplica-se a dados administrativos após prazo de retenção

### 10.5. Portabilidade (Art. 18, V)

**O que:** Transferir dados para outra ILPI (em caso de mudança de instituição)

**Como:**
1. Responsável legal solicita transferência à ILPI
2. ILPI exporta prontuário completo (JSON/PDF)
3. ILPI entrega ao responsável legal ou à nova instituição
4. Sistema registra exportação em log de auditoria

**Formatos disponíveis:**
- PDF (prontuários e relatórios)
- JSON (dados estruturados - portabilidade LGPD)
- CSV (planilhas para análise externa)

### 10.6. Informação sobre Compartilhamento (Art. 18, VII)

**O que:** Saber com quem dados foram compartilhados

**Resposta:** Dados NÃO são compartilhados com terceiros comerciais. Apenas:
- Suboperadores de infraestrutura (Hostinger, MinIO, Cloudflare)
- Autoridades sanitárias/judiciais (quando solicitado formalmente)
- Planos de saúde (se autorizado pela ILPI)

### 10.7. Revogação de Consentimento (Art. 18, IX)

**O que:** Revogar consentimento a qualquer momento

**Como:** Solicitar à ILPI

**Consequências:**
- Impossibilidade de continuar atendimento na ILPI (dados de saúde são obrigatórios para assistência)
- Dados já coletados podem ser mantidos por obrigação legal (prontuário - 20 anos)

### 10.8. Oposição ao Tratamento (Art. 18, §2º)

**O que:** Opor-se ao tratamento realizado sem consentimento (quando aplicável)

**Como:** Solicitar à ILPI explicação sobre base legal do tratamento

---

## 11. Como Exercer seus Direitos

### 11.1. Para Residentes e Responsáveis Legais

**Canal Principal:** **Contato direto com a ILPI** onde o residente está institucionalizado

**Informações a fornecer:**
- Nome completo do residente
- CPF do residente
- Comprovante de vínculo legal (certidão, termo de curatela, etc.)
- Descrição clara da solicitação

**Exemplos de solicitação:**
- "Gostaria de receber cópia do prontuário do meu pai, Sr. João Silva"
- "Preciso corrigir o número de telefone do responsável legal"
- "Solicito portabilidade dos dados para transferência de ILPI"

**Prazo de Resposta:**
- **Resposta inicial:** Até **5 dias úteis** (confirmação de recebimento)
- **Resposta definitiva:** Até **15 dias úteis** (LGPD Art. 19, §1º)
- **Solicitações complexas:** Até **30 dias úteis** (com justificativa)

### 11.2. Para ILPIs (Controladores)

**Dúvidas sobre processamento de dados:**
- **E-mail:** privacidade@rafalabs.com.br
- **Telefone:** (19) 98152-4849
- **DPO:** dpo@rafalabs.com.br

**Situações que a ILPI deve contatar a Rafa Labs:**
- Incidente de segurança (vazamento de dados)
- Solicitação de exclusão de tenant
- Dúvidas sobre configurações de privacidade
- Suporte técnico para atender direito do titular
- Exportação em massa de dados (portabilidade)

### 11.3. Alteração de Responsável Legal

**Situações:**
- Falecimento do responsável anterior
- Troca de curador (decisão judicial)
- Transferência de tutela

**Procedimento:**
1. Solicitação formal à ILPI
2. Apresentação de documentação comprobatória
3. Atualização no sistema (histórico mantido)
4. Novo responsável assina TCLE (Termo de Consentimento Livre e Esclarecido)

**Prazo:** Atualizado em até 5 dias úteis

---

## 12. Encarregado de Proteção de Dados (DPO)

### 12.1. DPO da Rafa Labs (Operadora)

**Nome:** Emanuel (Dr. E.) - CEO e Fundador da Rafa Labs
**E-mail:** dpo@rafalabs.com.br
**Telefone:** (19) 98152-4849
**Endereço:** Rafa Labs Desenvolvimento e Tecnologia, São Paulo/SP

**Atribuições:**
- Orientar ILPIs sobre configurações de privacidade
- Receber comunicações da ANPD
- Gerenciar incidentes de segurança da plataforma
- Manter conformidade técnica com LGPD
- Executar demais atribuições do Art. 41 da LGPD

### 12.2. DPO da ILPI (Controladora)

**Responsabilidade:** Cada ILPI deve designar seu próprio Encarregado

**Atribuições do DPO da ILPI:**
- Receber solicitações de responsáveis legais (Art. 18 LGPD)
- Interface entre ILPI e Rafa Labs
- Orientar equipe da ILPI sobre proteção de dados
- Registrar e responder a reclamações de titulares

**Recomendação:** ILPI deve publicar contato do DPO em local visível (recepção, site institucional)

---

## 13. Incidentes de Segurança (Data Breach)

### 13.1. Fluxo de Notificação

**1. Detecção (Rafa Labs):**
- Monitoramento 24/7 de acessos suspeitos
- Alertas automáticos de tentativas de invasão
- Detecção: < 2 horas

**2. Notificação à ILPI (< 24 horas):**

Rafa Labs notifica **administrador e DPO da ILPI** via:
- E-mail urgente
- Telefone (casos críticos)
- Painel de avisos no sistema

**Informações fornecidas:**
- Natureza do incidente (ex: tentativa de acesso não autorizado)
- Dados potencialmente afetados
- Número de residentes impactados
- Medidas corretivas implementadas
- Recomendações para a ILPI

**3. ILPI notifica responsáveis legais:**
- A **ILPI** é responsável por comunicar titulares afetados
- Prazo: Imediato (se risco relevante)
- Canais: E-mail, telefone, comunicado presencial

**4. ANPD (Autoridade Nacional):**
- **Rafa Labs** notifica ANPD (< 2 dias úteis)
- **ILPI** deve cooperar fornecendo informações adicionais

### 13.2. Relatório Pós-Incidente

Após o incidente, a Rafa Labs fornecerá **Relatório Pós-Incidente** em até 15 dias úteis, contendo:
- Análise de causa raiz
- Dados efetivamente afetados
- Plano de ação corretivo
- Medidas permanentes implementadas

---

## 14. Transferência Internacional de Dados

**Política:** O Sistema Rafa ILPI **NÃO realiza transferência internacional** de dados.

- Todos os servidores estão localizados **no Brasil** (São Paulo/SP)
- Backups armazenados **em território nacional**
- Conformidade com **LGPD Art. 33** (transferência internacional requer consentimento específico ou adequação)

**Exceção:** Serviços de infraestrutura (Hostinger, Cloudflare) podem ter réplicas técnicas em servidores internacionais, mas com **criptografia em todas as camadas** (Transport, Storage, Database).

---

## 15. Cookies e Sessão

### 15.1. Cookies Utilizados

O Sistema Rafa ILPI utiliza **cookies essenciais** para autenticação de profissionais:

| Nome | Finalidade | Prazo | Tipo |
|------|-----------|-------|------|
| `access_token` | Autenticação JWT do profissional | 8 horas | Essencial |
| `refresh_token` | Renovação de sessão | 7 dias | Essencial |
| `tenant_id` | Identificação da ILPI (isolamento multi-tenant) | Sessão | Essencial |

### 15.2. Sem Rastreamento

- **NÃO utiliza** Google Analytics
- **NÃO utiliza** Facebook Pixel
- **NÃO utiliza** cookies de marketing ou rastreamento

**Motivo:** Sistema B2B focado em privacidade e conformidade LGPD

### 15.3. Controle de Cookies

- Usuário pode **limpar cookies** via navegador
- Remoção de cookies resultará em **logout automático**

---

## 16. Uso de Inteligência Artificial (IA)

**Status Atual:** O Sistema Rafa ILPI **NÃO utiliza** Inteligência Artificial para tomada de decisões automatizadas.

**Futuro:** Caso IA seja implementada (ex: alertas preditivos de saúde), será garantido:
- **LGPD Art. 20:** Direito de revisão de decisões automatizadas
- **Transparência:** Explicação de lógica e critérios utilizados
- **Supervisão humana:** Profissional de saúde valida decisões críticas

---

## 17. Proteção Especial ao Idoso

### 17.1. Estatuto do Idoso (Lei 10.741/2003)

**Art. 10º** - Direito à informação clara sobre saúde:
- Responsável legal receberá relatórios mensais de saúde (mediante solicitação à ILPI)
- Acesso facilitado ao prontuário (via ILPI)

**Art. 48º** - Respeito e dignidade:
- Dados de saúde mental tratados com sigilo reforçado
- Profissionais treinados em proteção de dados sensíveis

**Art. 49º** - Proibição de discriminação:
- Dados de raça/cor/religião usados APENAS para cuidado personalizado
- NUNCA para discriminação ou tratamento desigual

### 17.2. Consentimento de Idoso Incapaz

- Se interditado: responsável legal assina TCLE
- Se lúcido: próprio idoso pode consentir (mesmo com + 60 anos)
- Curador/tutor registrado no sistema

### 17.3. Residentes sob Curatela ou Tutela

**Consentimento:**
- Curador/tutor deve assinar TCLE (Termo de Consentimento)
- Cópia da sentença de interdição anexada ao cadastro

**Acesso a Dados:**
- Curador tem acesso total ao prontuário (via ILPI)
- Sistema registra vínculo legal (campo `legalGuardianType`)

**Revogação:**
- Apenas por decisão judicial
- Curador não pode revogar consentimento unilateralmente

---

## 18. Videomonitoramento e Segurança Física

**Aplicável:** Caso a ILPI possua sistema de câmeras

**Finalidade:**
- Segurança dos residentes e profissionais
- Prevenção de acidentes e quedas
- Monitoramento de áreas comuns (não quartos/banheiros)

**Base Legal:** LGPD Art. 7º, IX (proteção à vida)

**Retenção:** 30 dias (sobrescrita automática)

**Acesso:** Apenas coordenação e segurança da ILPI

**Privacidade:**
- ❌ NÃO há câmeras em quartos privativos
- ❌ NÃO há câmeras em banheiros
- ✅ Sinalização visível em áreas monitoradas

**Observação:** Dados de videomonitoramento **NÃO são armazenados** no Sistema Rafa ILPI.

---

## 19. Auditoria e Governança de Dados

### 19.1. Auditoria Interna

**Frequência:** Trimestral

**O que auditamos:**
- Acessos não autorizados (tentativas de login suspeitas)
- Modificações em massa de dados
- Exclusões de registros (justificativas)
- Exportações de dados (quem, quando, o quê)

**Relatório:**
- Gerado automaticamente pelo sistema
- Enviado ao DPO da Rafa Labs e disponível para ILPIs mediante solicitação

### 19.2. Auditoria Externa (ANVISA/Vigilância)

**Procedimento:**
- Solicitação formal via ofício à ILPI
- ILPI solicita à Rafa Labs exportação de dados
- Prazo de atendimento: 10 dias úteis
- Dados fornecidos: Apenas scope solicitado
- Registro de compartilhamento: Log de auditoria

### 19.3. Auditoria de Segurança pela ILPI

A ILPI poderá, mediante solicitação formal com **15 dias de antecedência**, auditar as medidas de segurança da Rafa Labs:

**Formatos:**
- **Remota:** Apresentação de relatórios técnicos, certificados SSL, logs de backup
- **Presencial (Plano Enterprise):** Visita técnica ao datacenter (sujeita a aprovação do provedor)

**Relatório de Conformidade LGPD:**
- Fornecido anualmente ou mediante solicitação
- Contém evidências das medidas técnicas e organizacionais de proteção de dados

---

## 20. Relatório de Impacto à Proteção de Dados (RIPD)

**Exigência Legal:** LGPD Art. 38 (dados sensíveis em larga escala)

**Status:** Elaborado em Dezembro/2025

**Escopo:**
- Mapeamento de fluxo de dados sensíveis (saúde)
- Avaliação de riscos (vazamento, acesso não autorizado)
- Medidas de mitigação (3 camadas criptografia)

**Disponibilidade:**
- Resumo público: Disponível mediante solicitação
- Versão completa: Mediante solicitação à ANPD

**Revisão:** Anual ou quando houver mudanças significativas

---

## 21. Alterações nesta Política

### 21.1. Atualizações

Esta Política de Privacidade pode ser atualizada para refletir:
- Mudanças na legislação (LGPD, ANVISA, CFM)
- Novas funcionalidades do sistema
- Melhorias em segurança e privacidade

### 21.2. Comunicação de Alterações

- **Alterações substanciais:** Comunicação às ILPIs por e-mail com **30 dias de antecedência**
- **Alterações menores:** Publicação no sistema com aviso de atualização
- **Histórico de versões:** Disponível em docs/POLITICA-DE-PRIVACIDADE.md

### 21.3. Histórico de Versões

| Versão | Data | Principais Alterações |
|--------|------|----------------------|
| **2.1** | 24/12/2025 | Ajustes para contexto B2B: distinção Controlador/Operador, fluxo de solicitações via ILPI, DPOs separados |
| **2.0** | 14/12/2025 | Implementação completa de 3 camadas de criptografia LGPD |
| 1.0 | 01/01/2025 | Versão inicial (placeholder) |

---

## 22. Conformidade Regulatória - Checklist

### 22.1. LGPD (Lei nº 13.709/2018)

- [x] **Art. 5º** - Definições de dados pessoais e sensíveis
- [x] **Art. 6º** - Princípios (finalidade, adequação, necessidade, transparência, segurança)
- [x] **Art. 7º** - Bases legais para tratamento (consentimento, execução de contrato, obrigação legal)
- [x] **Art. 11** - Tratamento de dados sensíveis (tutela da saúde)
- [x] **Art. 14** - Tratamento de dados de menores (não aplicável - ILPIs atendem idosos)
- [x] **Art. 16** - Eliminação de dados após término da finalidade
- [x] **Art. 18** - Direitos do titular (acesso, correção, portabilidade, eliminação)
- [x] **Art. 33** - Transferência internacional (não realizada)
- [x] **Art. 37** - Registro de operações de tratamento
- [x] **Art. 38** - Relatório de Impacto (RIPD elaborado)
- [x] **Art. 41** - Encarregado de Proteção de Dados (DPO designado)
- [x] **Art. 46** - Medidas técnicas de segurança (criptografia AES-256-GCM)
- [x] **Art. 48** - Comunicação de incidentes de segurança

### 22.2. RDC 502/2021 ANVISA

- [x] **Art. 33** - Registro completo e seguro de informações de saúde
- [x] **Art. 34** - Prontuário eletrônico padronizado
- [x] **Art. 35** - Acesso restrito a profissionais autorizados

### 22.3. CFM 1.821/2007

- [x] **Art. 5º** - Prontuário eletrônico deve garantir segurança, confidencialidade e integridade
- [x] **Art. 7º** - Retenção mínima de 20 anos
- [x] **Art. 9º** - Rastreabilidade de acessos e modificações

### 22.4. Lei nº 13.787/2018

- [x] Digitalização de documentos médicos com validade legal
- [ ] Assinatura digital qualificada (ICP-Brasil) - em implementação futura

---

## 23. Glossário

- **AES-256-GCM:** Advanced Encryption Standard com chave de 256 bits em modo Galois/Counter (criptografia autenticada)
- **ANPD:** Autoridade Nacional de Proteção de Dados (órgão fiscalizador da LGPD)
- **CFM:** Conselho Federal de Medicina
- **Controlador:** Quem decide quais dados coletar e por quê (ILPI)
- **DPO:** Data Protection Officer (Encarregado de Proteção de Dados)
- **ILPI:** Instituição de Longa Permanência para Idosos
- **JWT:** JSON Web Token (token de autenticação)
- **KDF:** Key Derivation Function (função de derivação de chave - Scrypt)
- **LGPD:** Lei Geral de Proteção de Dados (Lei nº 13.709/2018)
- **Operador:** Quem processa dados sob instrução do Controlador (Rafa Labs)
- **RBAC:** Role-Based Access Control (controle de acesso baseado em funções)
- **RDC:** Resolução da Diretoria Colegiada (ANVISA)
- **RIPD:** Relatório de Impacto à Proteção de Dados
- **Scrypt:** Algoritmo de derivação de chave resistente a ataques de força bruta
- **SSE:** Server-Side Encryption (criptografia no servidor)
- **TCLE:** Termo de Consentimento Livre e Esclarecido
- **TLS:** Transport Layer Security (criptografia em trânsito)

---

## 24. Documentação Técnica Complementar

Para detalhes técnicos sobre implementação:

- **Arquitetura Multi-Tenant:** docs/architecture/multi-tenancy.md
- **Criptografia (3 Camadas):** docs/security/ENCRYPTION.md
- **Esquema de Banco de Dados:** docs/architecture/database-schema.md
- **Auditoria e Logs:** docs/architecture/audit-logs.md

**Acesso:** Documentação técnica disponível apenas para equipe da ILPI mediante solicitação formal

---

## 25. Contato

**Rafa Labs Desenvolvimento e Tecnologia**

- **Site:** https://rafalabs.com.br
- **E-mail Geral:** contato@rafalabs.com.br
- **E-mail Privacidade:** privacidade@rafalabs.com.br
- **E-mail DPO:** dpo@rafalabs.com.br
- **Telefone:** (19) 98152-4849
- **CNPJ:** 63.409.303/0001-82
- **Endereço:** São Paulo/SP

**Horário de Atendimento:**
- Segunda a Sexta: 9h às 18h (horário de Brasília)
- Sábados, Domingos e Feriados: Apenas emergências (via e-mail)

---

**Última atualização:** 24/12/2025 às 10:00 (Brasília)
**Responsável pela atualização:** Emanuel (Dr. E.) - CEO Rafa Labs
**Versão:** 2.1 - Conformidade LGPD Completa (Contexto B2B)

---

*Este documento foi elaborado em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), RDC 502/2021 ANVISA, CFM 1.821/2007 e Lei nº 13.787/2018. Para dúvidas ou sugestões, entre em contato com nosso Encarregado de Proteção de Dados (DPO).*
