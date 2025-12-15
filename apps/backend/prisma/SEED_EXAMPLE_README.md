# Seed de Exemplo - Casa de Repouso São Rafael

Este arquivo documenta o seed de dados de exemplo criado para facilitar o desenvolvimento e testes do sistema Rafa ILPI.

## 📦 O que é criado?

O seed de exemplo (`seed-example.ts`) cria uma ILPI completa e realista baseada em **Casa de Repouso São Rafael**, localizada em Campinas/SP.

### Estrutura de Dados

#### 🏢 Instituição (Tenant)
- **Nome:** Casa de Repouso São Rafael
- **CNPJ:** 23.456.789/0001-01
- **Endereço:** Rua Dr. Quirino, 1850 - Campinas/SP - CEP 13015-082
- **Telefone:** (19) 3521-8900
- **Email:** contato@casasaorafael.com.br
- **Plano:** Profissional (permite até 100 residentes)

#### 👥 Equipe (8 usuários)

**Estrutura organizacional real de ILPI com Sistema RBAC Híbrido:**

1. **Proprietário/Sócio (ADMIN)**
   - Email: `admin@teste.com.br`
   - Nome: Rafael Augusto Camargo
   - Role: ADMIN
   - PositionCode: ADMINISTRATOR

2. **Médico (USER)**
   - Email: `medico@teste.com.br`
   - Nome: Dr. Roberto Fernandes Lopes
   - Role: USER
   - PositionCode: DOCTOR
   - Registro: CRM/SP 98765

3. **RT Enfermeiro (USER)**
   - Email: `rt@teste.com.br`
   - Nome: Fernanda Almeida Santos
   - Role: USER
   - PositionCode: NURSE
   - Registro: COREN/SP 198765
   - **isTechnicalManager: true** (Responsável Técnico)

4. **Administrativo (USER)**
   - Email: `administrativo@teste.com.br`
   - Nome: Juliana Costa Martins
   - Role: USER
   - PositionCode: ADMINISTRATIVE_ASSISTANT

5-8. **Cuidadores (USER) - Escala 12x36h**

   - Role: USER
   - PositionCode: CAREGIVER
   - **Dia 1:** `cuidador.dia1@teste.com.br` - Carlos Mendes Silva
   - **Dia 2:** `cuidador.dia2@teste.com.br` - Simone Oliveira Cardoso
   - **Noite 1:** `cuidador.noite1@teste.com.br` - Marcelo Ribeiro Costa
   - **Noite 2:** `cuidador.noite2@teste.com.br` - Patricia Santos Lima

**Senha padrão para todos:** `Senha@123`

#### 🏗️ Estrutura Física

**1 Prédio:** Casa Principal (código: C)
- **1 Andar:** Térreo (código: T)
- **8 Quartos:**
  - 4 Individuais (Quarto 1, 2, 3, 4) - 1 leito cada = 4 leitos
  - 4 Coletivos (Quarto 5, 6, 7, 8) - 4 leitos cada = 16 leitos
- **Total:** 20 leitos

**Sistema de Códigos:**
- Prédio: `C` (Casa Principal)
- Andar: `T` (Térreo)
- Quartos: `001` a `008`
- Leitos: `A`, `B`, `C`, `D` (conforme capacidade)

**Exemplo de código completo:** `CT-001-A` (Casa Térrea, Quarto 001, Leito A)

#### 👴 Residentes (8 ativos)

Taxa de ocupação: **40%** (8 de 20 leitos ocupados)

Todos os residentes possuem:
- ✅ Dados pessoais completos (nome, CPF, RG, CNS)
- ✅ Endereço da região de Campinas
- ✅ Telefones com DDD (19)
- ✅ Responsável legal com contato
- ✅ Nível de dependência (I1, I2 ou I3)
- ✅ Quarto e leito atribuídos
- ✅ Status ativo

**Lista de Residentes:**

1. Maria Aparecida da Silva (87 anos) - I1 - Leito CT-001-A
2. João Carlos Santos (82 anos) - I2 - Leito CT-002-A
3. Ana Paula Oliveira (79 anos) - I2 - Leito CT-003-A
4. José Roberto Ferreira (85 anos) - I1 - Leito CT-004-A
5. Antônia Souza Lima (91 anos) - I3 - Leito CT-005-A
6. Carlos Alberto Mendes (78 anos) - I1 - Leito CT-005-B
7. Rosa Maria Costa (88 anos) - I2 - Leito CT-006-A
8. Francisco Alves Pereira (83 anos) - I2 - Leito CT-006-B

## 🚀 Como Usar

### Executar o Seed de Exemplo

```bash
cd apps/backend
npm run prisma:seed:example
```

Este comando:
1. ✅ Cria o tenant "Casa de Repouso São Rafael"
2. ✅ Cria 8 cargos (Positions)
3. ✅ Cria 8 usuários (staff completo)
4. ✅ Cria estrutura física (1 prédio, 1 andar, 8 quartos, 20 leitos)
5. ✅ Cria 8 residentes com dados completos

### Login no Sistema

Você pode fazer login com qualquer um dos usuários criados:

**Admin (acesso total):**

```text
Email: admin@teste.com.br
Senha: Senha@123
```

**Médico:**

```text
Email: medico@teste.com.br
Senha: Senha@123
```

**RT Enfermeiro:**

```text
Email: rt@teste.com.br
Senha: Senha@123
```

**Administrativo:**

```text
Email: administrativo@teste.com.br
Senha: Senha@123
```

**Cuidador (exemplo):**

```text
Email: cuidador.dia1@teste.com.br
Senha: Senha@123
```

### Resetar o Banco de Dados

Se precisar limpar tudo e recomeçar:

```bash
cd apps/backend

# Resetar banco (CUIDADO: apaga tudo!)
npx prisma migrate reset

# Rodar seed principal (Plans)
npm run prisma:seed

# Rodar seed de exemplo
npm run prisma:seed:example
```

## 📊 Casos de Uso

Este seed é perfeito para testar:

### ✅ Autenticação e Autorização
- Login com diferentes níveis de acesso (ADMIN, MANAGER, USER)
- Verificar permissões por role

### ✅ Gestão de Residentes
- Listar residentes
- Visualizar perfis completos
- Filtrar por dependência (I1, I2, I3)
- Buscar por quarto/leito

### ✅ Gestão de Estrutura
- Visualizar prédios/andares/quartos
- Verificar taxa de ocupação (40%)
- Listar leitos disponíveis (12 vazios)

### ✅ Multi-tenancy
- Isolamento de dados por tenant
- Verificar que usuários só veem dados da Casa São Rafael

### ✅ Módulos Clínicos
- Registrar prescrições médicas
- Criar evoluções clínicas
- Agendar consultas
- Registrar sinais vitais

### ✅ Escala de Trabalho
- Visualizar escala 12x36h dos cuidadores
- Programar substituições
- Verificar cobertura dia/noite

## 🔍 Diferenças do Seed Principal

| Característica | seed.ts | seed-example.ts |
|----------------|---------|-----------------|
| **Propósito** | Setup inicial obrigatório | Dados de teste opcionais |
| **Dados** | Apenas Plans (FREE, BASICO, etc) | Tenant completo + Residentes |
| **Execução** | Automática (`prisma migrate reset`) | Manual (`npm run prisma:seed:example`) |
| **Ambiente** | Produção + Desenvolvimento | Apenas Desenvolvimento |

## ⚠️ Avisos Importantes

### NÃO USE EM PRODUÇÃO!

Este seed é apenas para **desenvolvimento e testes locais**. NUNCA execute em ambiente de produção.

### Dados Fictícios

Todos os dados são fictícios:
- ❌ CPFs, RGs e CNS não são reais
- ❌ Telefones e endereços são exemplos
- ❌ Nomes de pessoas foram inventados
- ❌ CNPJ é fictício

### Multi-tenancy

O seed cria apenas **1 tenant**. Se você já tiver outros tenants no banco, eles não serão afetados (isolamento por `tenantId`).

## 🛠️ Troubleshooting

### Erro: "Tenant already exists"

O seed usa `upsert`, então se você rodar múltiplas vezes, ele apenas atualiza os dados. Não há problema em executar novamente.

### Erro: "Plan 'profissional' not found"

Execute primeiro o seed principal:

```bash
npm run prisma:seed
```

### Erro: "Position not found"

O seed cria as positions automaticamente. Verifique se o script está rodando completamente sem erros no meio.

## 📝 Manutenção

Se precisar ajustar os dados de exemplo:

1. Edite `/apps/backend/prisma/seed-example.ts`
2. Execute novamente: `npm run prisma:seed:example`
3. Os dados serão atualizados (upsert)

---

**Desenvolvido para:** Rafa Labs Desenvolvimento e Tecnologia
**Versão:** 1.0
**Última atualização:** 15/12/2025
