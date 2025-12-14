# Política de Privacidade - Sistema Rafa ILPI

**Versão:** 2.0
**Data de Vigência:** 14/12/2025
**Última Atualização:** 14/12/2025
**Responsável:** Rafa Labs Desenvolvimento e Tecnologia

---

## 1. Introdução

Esta Política de Privacidade descreve como o **Sistema Rafa ILPI** coleta, usa, armazena e protege os dados pessoais de **residentes**, **responsáveis legais**, **profissionais de saúde** e **administradores** de Instituições de Longa Permanência para Idosos (ILPIs).

O Sistema Rafa ILPI é uma plataforma de gestão de saúde desenvolvida pela **Rafa Labs Desenvolvimento e Tecnologia** em conformidade com:

- **LGPD** (Lei Geral de Proteção de Dados - Lei nº 13.709/2018)
- **RDC 502/2021 ANVISA** (Regulamento Técnico para ILPIs)
- **CFM 1.821/2007** (Prontuário Eletrônico do Paciente)
- **Lei nº 13.787/2018** (Digitalização de documentos médicos)

---

## 2. Definições

- **Titular dos Dados**: Pessoa física a quem os dados pessoais se referem (residente, responsável legal, profissional).
- **Controlador**: A ILPI (instituição) que contrata o Sistema Rafa ILPI.
- **Operador**: Rafa Labs, que processa dados em nome do Controlador.
- **Dados Pessoais**: Informação relacionada a pessoa natural identificada ou identificável.
- **Dados Sensíveis**: Dados de saúde, biométricos, genéticos (Art. 5º, II da LGPD).
- **Tratamento**: Qualquer operação com dados (coleta, armazenamento, consulta, compartilhamento, exclusão).

---

## 3. Dados Coletados

### 3.1. Dados de Identificação do Residente

**Base Legal:** Art. 7º, I (consentimento) + Art. 11, II, c (tutela da saúde)

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

**Base Legal:** Art. 7º, I (consentimento)

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
- **Alergias**: alérgeno, reação, observações (criptografado)
- **Condições Médicas**: nome da condição, CID-10, observações (criptografado)
- **Prescrições**: observações gerais (criptografado)
- **Medicações**: instruções de uso, observações (criptografado)
- **Evoluções Clínicas (SOAP)**: subjetivo, objetivo, avaliação, plano (criptografado)
- **Registros Diários**: observações de enfermagem (criptografado)

#### Dados NÃO Criptografados (necessários para funcionalidades):
- **Sinais Vitais**: PA, FC, temperatura, saturação O2, glicemia (valores numéricos)
- **Vacinações**: vacina aplicada, dose, lote, data de aplicação
- **Exames laboratoriais**: tipo, resultado, data
- **Perfil Clínico**: tipo sanguíneo, alergias (flag), marcapasso (flag)
- **Restrições Alimentares**: tipo de restrição, observações

### 3.4. Dados Administrativos

**Base Legal:** Art. 7º, I (consentimento) + Art. 7º, V (execução de contrato)

- **Data de admissão**
- **Data de alta/óbito**
- **Motivo da alta**
- **Tipo de acomodação**
- **Plano de saúde**
- **Situação cadastral** (ativo/inativo)

### 3.5. Dados de Profissionais de Saúde

**Base Legal:** Art. 7º, V (execução de contrato)

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
| **Dados de Identificação** | Consentimento do titular ou responsável legal | Art. 7º, I |
| **Dados de Saúde** | Tutela da saúde por profissionais da saúde | Art. 11, II, c |
| **Dados Administrativos** | Execução de contrato (serviço de institucionalização) | Art. 7º, V |
| **Dados de Profissionais** | Execução de contrato de trabalho | Art. 7º, V |
| **Logs de Auditoria** | Cumprimento de obrigação legal e regulatória | Art. 7º, II |

---

## 6. Compartilhamento de Dados

### 6.1. Com Terceiros

O Sistema Rafa ILPI **NÃO compartilha dados** com terceiros, exceto nas seguintes situações:

#### Compartilhamento Autorizado:
- **Operadores de Infraestrutura**: Hostinger (hospedagem do servidor - isolamento por tenant)
- **Backup e Disaster Recovery**: Serviços de backup em nuvem (dados criptografados)

#### Compartilhamento Legal:
- **Autoridades de Saúde**: ANVISA, Vigilância Sanitária (em caso de fiscalização)
- **Autoridades Judiciais**: Mediante ordem judicial
- **ANPD (Autoridade Nacional de Proteção de Dados)**: Mediante solicitação formal

### 6.2. Isolamento Multi-Tenant

Cada ILPI possui seu **próprio schema de banco de dados** isolado. Dados de uma instituição **NUNCA são acessíveis** por outra instituição.

**Isolamento Criptográfico:** Cada tenant possui chave de criptografia derivada única, garantindo que mesmo um vazamento de dados de um tenant não compromete outros.

---

## 7. Armazenamento e Segurança

### 7.1. Medidas Técnicas de Segurança (LGPD Art. 46)

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

### 7.2. Controle de Acesso (RBAC)

- **Autenticação**: JWT (JSON Web Token) com expiração de 8 horas
- **Autorização**: Role-Based Access Control (RBAC)
  - Admin (acesso total)
  - Médico/Enfermeiro (acesso a dados clínicos)
  - Cuidador (acesso a registros diários)
  - Administrativo (acesso a dados cadastrais)
- **Auditoria**: Logs de acesso e modificações (UserHistory, ResidentHistory, etc.)

### 7.3. Backup e Disaster Recovery

- **Backup automático diário** do banco de dados PostgreSQL
- **Retenção**: 30 dias
- **Backup criptografado** (AES-256)
- **Teste de restauração**: Mensal
- **RTO (Recovery Time Objective)**: 4 horas
- **RPO (Recovery Point Objective)**: 24 horas

### 7.4. Localização dos Dados

- **Servidor Principal**: Hostinger KVM (São Paulo, Brasil)
- **Backup**: Cloud Storage criptografado (região Brasil)
- **Dados NÃO são transferidos** para fora do Brasil (conformidade LGPD Art. 33)

---

## 8. Retenção de Dados

### 8.1. Dados Clínicos (Prontuário Eletrônico)

**Prazo:** **PERMANENTE** (20 anos mínimo, mas mantidos indefinidamente)

**Base Legal:**
- **CFM 1.821/2007**: Prontuário deve ser mantido por no mínimo 20 anos após último registro
- **Lei nº 13.787/2018**: Digitalização de prontuários (validade legal permanente)
- **RDC 502/2021 ANVISA Art. 33**: Registros de saúde devem ser mantidos por prazo legal

**Dados incluídos:**
- Alergias, condições médicas, prescrições, medicações
- Evoluções clínicas, registros diários, sinais vitais
- Exames, vacinações, procedimentos
- Histórico de versionamento (auditoria clínica)

### 8.2. Dados Administrativos

**Prazo:** **5 anos** após término do serviço (alta/óbito)

**Base Legal:**
- Código Civil Art. 206, §3º (prescrição de ações)
- LGPD Art. 16 (eliminação após fim da finalidade)

**Dados incluídos:**
- Dados cadastrais do residente e responsável legal
- Dados de admissão e alta
- Documentos administrativos

### 8.3. Dados de Profissionais

**Prazo:** **5 anos** após desligamento

**Base Legal:**
- CLT (Consolidação das Leis do Trabalho)
- LGPD Art. 16

### 8.4. Logs de Auditoria

**Prazo:** **5 anos** (alinhado com prazos legais de auditoria)

**Base Legal:**
- LGPD Art. 37 (evidência de conformidade)
- RDC 502/2021 ANVISA (rastreabilidade)

---

## 9. Direitos do Titular dos Dados (Residente/Responsável Legal)

Conforme **LGPD Art. 18**, o titular tem direito a:

### 9.1. Confirmação e Acesso (Art. 18, I e II)
- **Solicitar confirmação** de que seus dados estão sendo tratados
- **Acessar seus dados pessoais** (via portal ou solicitação à ILPI)
- **Obter cópia** do prontuário eletrônico em formato digital (PDF/JSON)

### 9.2. Correção (Art. 18, III)
- **Corrigir dados incompletos, inexatos ou desatualizados**
- Contato: Encarregado de Dados da ILPI ou suporte@rafalabs.com.br

### 9.3. Anonimização, Bloqueio ou Eliminação (Art. 18, IV)
- **Anonimização**: Remoção de identificadores pessoais (nome, CPF, RG, CNS)
- **Bloqueio**: Suspensão temporária de acesso aos dados
- **Eliminação**: Exclusão de dados desnecessários ou tratados em desacordo com a LGPD

**Limitações:**
- Dados clínicos (prontuário) **NÃO podem ser eliminados** por obrigação legal (CFM 1.821/2007)
- Exclusão aplica-se a dados administrativos após prazo de retenção

### 9.4. Portabilidade (Art. 18, V)
- **Obter cópia** de seus dados em formato estruturado e interoperável (JSON, CSV)
- **Transferir dados** para outro serviço (mediante solicitação formal)

### 9.5. Informação sobre Compartilhamento (Art. 18, VII)
- **Saber com quem** seus dados foram compartilhados (resposta: não há compartilhamento com terceiros, exceto infraestrutura)

### 9.6. Revogação de Consentimento (Art. 18, IX)
- **Revogar consentimento** a qualquer momento
- **Consequências**: Impossibilidade de continuar atendimento na ILPI (dados de saúde são obrigatórios)

### 9.7. Oposição ao Tratamento (Art. 18, §2º)
- **Opor-se** ao tratamento realizado sem consentimento (quando aplicável)

---

## 10. Como Exercer seus Direitos

### 10.1. Canais de Atendimento

**Para Residentes e Responsáveis Legais:**
1. **Contato direto com a ILPI** (Encarregado de Dados da instituição)
2. **E-mail**: privacidade@rafalabs.com.br (Rafa Labs - DPO)
3. **Telefone**: (19) 98152-4849 (Segunda a Sexta, 9h-18h)
4. **Portal do Titular**: [Em desenvolvimento] - Autoatendimento para acesso e correção de dados

### 10.2. Prazo de Resposta

- **Resposta inicial**: Até **5 dias úteis** (confirmação de recebimento)
- **Resposta definitiva**: Até **15 dias úteis** (LGPD Art. 19, §1º)
- **Solicitações complexas**: Até **30 dias úteis** (com justificativa)

### 10.3. Formato de Solicitação

**Informações necessárias:**
- Nome completo do titular
- CPF do titular
- Dados de contato (e-mail, telefone)
- Descrição clara da solicitação
- Comprovante de identidade (RG ou CNH digitalizado)

**Modelo de e-mail:**
```
Assunto: Solicitação de Acesso a Dados Pessoais - LGPD Art. 18

Nome: [Nome completo]
CPF: [000.000.000-00]
ILPI: [Nome da instituição]
Solicitação: [Descrever o direito que deseja exercer]

Anexo: Comprovante de identidade (RG/CNH)
```

---

## 11. Encarregado de Proteção de Dados (DPO)

Conforme **LGPD Art. 41**, a Rafa Labs designou um Encarregado de Proteção de Dados (DPO):

**Nome:** Emanuel (Dr. E.) - CEO e Fundador da Rafa Labs
**E-mail:** dpo@rafalabs.com.br
**Telefone:** (19) 98152-4849
**Endereço:** Rafa Labs Desenvolvimento e Tecnologia, [Endereço completo]

**Atribuições do DPO:**
- Aceitar reclamações e comunicações dos titulares
- Prestar esclarecimentos sobre tratamento de dados
- Receber comunicações da ANPD
- Orientar funcionários e contratados sobre práticas de proteção de dados
- Executar demais atribuições do Art. 41 da LGPD

---

## 12. Incidentes de Segurança (Data Breach)

### 12.1. Procedimento em Caso de Vazamento

Conforme **LGPD Art. 48**, em caso de incidente de segurança:

1. **Detecção e Contenção**: Imediata (< 2 horas)
2. **Investigação**: Identificar escopo e causa raiz (< 24 horas)
3. **Comunicação à ANPD**: Até **2 dias úteis** após ciência do incidente
4. **Comunicação aos Titulares**: Imediata (se risco ou dano relevante)
5. **Medidas Corretivas**: Implementação de correções permanentes (< 7 dias)

### 12.2. Informações Comunicadas

- **Natureza do incidente**: Tipo de vulnerabilidade explorada
- **Dados afetados**: Quais tipos de dados foram expostos
- **Titulares afetados**: Quantos e quais residentes/profissionais
- **Medidas técnicas adotadas**: Correções implementadas
- **Riscos aos titulares**: Avaliação de impacto (baixo, médio, alto)
- **Medidas recomendadas**: Ações que o titular deve tomar (ex: troca de senha)

### 12.3. Canal de Comunicação

- **E-mail direto** para responsáveis legais cadastrados
- **Aviso no sistema** (banner de alerta)
- **Publicação no site** da Rafa Labs (https://rafalabs.com.br)
- **Comunicação à ANPD** via formulário oficial

---

## 13. Transferência Internacional de Dados

**Política:** O Sistema Rafa ILPI **NÃO realiza transferência internacional** de dados.

- Todos os servidores estão localizados **no Brasil**
- Backups armazenados **em território nacional**
- Conformidade com **LGPD Art. 33** (transferência internacional requer consentimento específico ou adequação)

**Exceção:** Serviços de infraestrutura (Hostinger, Cloudflare) podem ter réplicas técnicas em servidores internacionais, mas com **criptografia em todas as camadas** (Transport, Storage, Database).

---

## 14. Cookies e Tecnologias de Rastreamento

### 14.1. Cookies Utilizados

O Sistema Rafa ILPI utiliza **cookies essenciais** para funcionamento:

| Nome | Finalidade | Prazo | Tipo |
|------|-----------|-------|------|
| `access_token` | Autenticação JWT | 8 horas | Essencial |
| `tenant_id` | Identificação da ILPI | Sessão | Essencial |

### 14.2. Sem Cookies de Terceiros

- **NÃO utiliza** Google Analytics
- **NÃO utiliza** Facebook Pixel
- **NÃO utiliza** cookies de marketing ou rastreamento

### 14.3. Controle de Cookies

- Usuário pode **limpar cookies** via navegador
- Remoção de cookies resultará em **logout automático**

---

## 15. Uso de Inteligência Artificial (IA)

**Status Atual:** O Sistema Rafa ILPI **NÃO utiliza** Inteligência Artificial para tomada de decisões automatizadas.

**Futuro:** Caso IA seja implementada (ex: alertas preditivos de saúde), será garantido:
- **LGPD Art. 20**: Direito de revisão de decisões automatizadas
- **Transparência**: Explicação de lógica e critérios utilizados
- **Supervisão humana**: Profissional de saúde valida decisões críticas

---

## 16. Menores de Idade e Idosos

### 16.1. Tratamento de Dados de Idosos

Conforme **Estatuto do Idoso (Lei nº 10.741/2003)** e **LGPD**:

- **Consentimento específico** do responsável legal (quando idoso incapaz)
- **Tutela de saúde** justifica tratamento mesmo sem consentimento explícito (Art. 11, II, c)
- **Transparência aumentada** nas comunicações

### 16.2. Menores de 18 Anos

Residentes menores de idade (raro em ILPIs, mas possível):
- **LGPD Art. 14**: Consentimento específico de ao menos um dos pais ou responsável legal
- **Melhor interesse da criança/adolescente** como princípio orientador

---

## 17. Alterações nesta Política

### 17.1. Atualizações

Esta Política de Privacidade pode ser atualizada para refletir:
- Mudanças na legislação (LGPD, ANVISA, CFM)
- Novas funcionalidades do sistema
- Melhorias em segurança e privacidade

### 17.2. Comunicação de Alterações

- **Alterações substanciais**: Comunicação por e-mail com **30 dias de antecedência**
- **Alterações menores**: Publicação no sistema com aviso de atualização
- **Histórico de versões**: Disponível em [docs/POLITICA-DE-PRIVACIDADE.md](POLITICA-DE-PRIVACIDADE.md)

### 17.3. Histórico de Versões

| Versão | Data | Principais Alterações |
|--------|------|----------------------|
| **2.0** | 14/12/2025 | Implementação completa de 3 camadas de criptografia LGPD |
| 1.0 | 01/01/2025 | Versão inicial (placeholder) |

---

## 18. Conformidade Regulatória - Checklist

### 18.1. LGPD (Lei nº 13.709/2018)

- [x] **Art. 5º** - Definições de dados pessoais e sensíveis
- [x] **Art. 6º** - Princípios (finalidade, adequação, necessidade, transparência, segurança)
- [x] **Art. 7º** - Bases legais para tratamento (consentimento, execução de contrato, obrigação legal)
- [x] **Art. 11** - Tratamento de dados sensíveis (tutela da saúde)
- [x] **Art. 14** - Tratamento de dados de menores
- [x] **Art. 16** - Eliminação de dados após término da finalidade
- [x] **Art. 18** - Direitos do titular (acesso, correção, portabilidade, eliminação)
- [x] **Art. 33** - Transferência internacional (não realizada)
- [x] **Art. 37** - Registro de operações de tratamento
- [x] **Art. 41** - Encarregado de Proteção de Dados (DPO)
- [x] **Art. 46** - Medidas técnicas de segurança (criptografia AES-256-GCM)
- [x] **Art. 48** - Comunicação de incidentes de segurança

### 18.2. RDC 502/2021 ANVISA

- [x] **Art. 33** - Registro completo e seguro de informações de saúde
- [x] **Art. 34** - Prontuário eletrônico padronizado
- [x] **Art. 35** - Acesso restrito a profissionais autorizados

### 18.3. CFM 1.821/2007

- [x] **Art. 5º** - Prontuário eletrônico deve garantir segurança, confidencialidade e integridade
- [x] **Art. 7º** - Retenção mínima de 20 anos
- [x] **Art. 9º** - Rastreabilidade de acessos e modificações

### 18.4. Lei nº 13.787/2018

- [x] Digitalização de documentos médicos com validade legal
- [x] Assinatura digital qualificada (ICP-Brasil) - em implementação

---

## 19. Glossário

- **AES-256-GCM**: Advanced Encryption Standard com chave de 256 bits em modo Galois/Counter (criptografia autenticada)
- **ANPD**: Autoridade Nacional de Proteção de Dados (órgão fiscalizador da LGPD)
- **CFM**: Conselho Federal de Medicina
- **DPO**: Data Protection Officer (Encarregado de Proteção de Dados)
- **ILPI**: Instituição de Longa Permanência para Idosos
- **JWT**: JSON Web Token (token de autenticação)
- **KDF**: Key Derivation Function (função de derivação de chave - Scrypt)
- **LGPD**: Lei Geral de Proteção de Dados (Lei nº 13.709/2018)
- **RBAC**: Role-Based Access Control (controle de acesso baseado em funções)
- **RDC**: Resolução da Diretoria Colegiada (ANVISA)
- **RIPD**: Relatório de Impacto à Proteção de Dados
- **Scrypt**: Algoritmo de derivação de chave resistente a ataques de força bruta
- **SSE**: Server-Side Encryption (criptografia no servidor)
- **TLS**: Transport Layer Security (criptografia em trânsito)

---

## 20. Contato

**Rafa Labs Desenvolvimento e Tecnologia**

- **Site:** https://rafalabs.com.br
- **E-mail Geral:** contato@rafalabs.com.br
- **E-mail Privacidade:** privacidade@rafalabs.com.br
- **E-mail DPO:** dpo@rafalabs.com.br
- **Telefone:** (19) 98152-4849
- **Endereço:** [Endereço completo da Rafa Labs]

**Horário de Atendimento:**
- Segunda a Sexta: 9h às 18h (horário de Brasília)
- Sábados, Domingos e Feriados: Apenas emergências (via e-mail)

---

**Última atualização:** 14/12/2025 às 08:00 (Brasília)
**Responsável pela atualização:** Emanuel (Dr. E.) - CEO Rafa Labs
**Versão:** 2.0 - Conformidade LGPD Completa (3 Camadas de Criptografia)

---

*Este documento foi elaborado em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), RDC 502/2021 ANVISA, CFM 1.821/2007 e Lei nº 13.787/2018. Para dúvidas ou sugestões, entre em contato com nosso Encarregado de Proteção de Dados (DPO).*
