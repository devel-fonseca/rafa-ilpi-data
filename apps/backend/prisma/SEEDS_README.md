# 🌱 Seeds ILPI Teste

Seeds modulares para criar dados de teste completos do tenant "TELE ENGENHARIA LTDA - Casa de Repouso Santa Teresinha".

## 📋 Estrutura dos Seeds

Os seeds foram divididos em módulos independentes que podem ser executados separadamente ou em sequência:

### 1. **seed-tenant-ilpiteste.ts**
Cria a estrutura básica do tenant:
- Tenant: TELE ENGENHARIA LTDA
- CNPJ: 51.482.599/0001-88
- Subscription: Plano Profissional (30 dias)
- Tenant Profile: Casa de Repouso Santa Teresinha (20 leitos)

```bash
npm run prisma:seed:tenant-ilpiteste
```

### 2. **seed-users-ilpiteste.ts**
Cria 7 usuários com perfis completos:
- **2 ADMIN:**
  - John Galt (Administrador)
  - Dagny Taggart (RT - Responsável Técnico, COREN)
- **5 USER:**
  - Eddie Willers (Cuidador Dia)
  - Nathaniel Branden (Técnico de Enfermagem, COREN)
  - Wesley Mouch (Cuidador Noite)
  - Hugh Askton (Cuidador Dia)
  - Floyd Ferris (Cuidador Noite)

**Senha padrão:** `Senha@123`

```bash
npm run prisma:seed:users-ilpiteste
```

### 3. **seed-shifts-ilpiteste.ts**
Cria estrutura completa de escalas de cuidadores:
- **4 Teams:**
  - Equipe A Dia (2 membros: Eddie + Nathaniel)
  - Equipe A Noite (1 membro: Wesley)
  - Equipe B Dia (1 membro: Hugh)
  - Equipe B Noite (1 membro: Floyd)
- **Weekly Pattern:** Padrão Quinzenal (2 semanas)
- **28 Assignments:** 2 turnos × 7 dias × 2 semanas

```bash
npm run prisma:seed:shifts-ilpiteste
```

### 4. **seed-residents-ilpiteste.ts**
Cria 3 residentes fictícios:
- Crispim Soares (78 anos, M, Solteiro)
- Fernão Mendes Pinto (77 anos, M)
- Joaquim Borba dos Santos (79 anos, M, Solteiro)

```bash
npm run prisma:seed:residents-ilpiteste
```

### 5. **seed-ilpiteste.ts** (Consolidado)
Seed completo em um único arquivo (mantido para compatibilidade).

```bash
npm run prisma:seed:ilpiteste
```

## 🚀 Uso

### Executar todos os seeds em sequência

```bash
npm run prisma:seed:ilpiteste:all
```

Isso executará os seeds na ordem correta:
1. tenant-ilpiteste
2. users-ilpiteste
3. shifts-ilpiteste
4. residents-ilpiteste

### Executar seeds individuais

Útil para testar ou recriar apenas partes específicas:

```bash
# Apenas tenant
npm run prisma:seed:tenant-ilpiteste

# Apenas usuários (requer tenant)
npm run prisma:seed:users-ilpiteste

# Apenas equipes e escalas (requer tenant + users)
npm run prisma:seed:shifts-ilpiteste

# Apenas residentes (requer tenant)
npm run prisma:seed:residents-ilpiteste
```

## 🔄 Recriar banco de dados com seeds

Para resetar completamente o banco e recriar com seeds:

```bash
# 1. Resetar banco (aplica todas migrations)
cd apps/backend
npm run prisma:migrate:dev -- reset

# 2. Executar seed principal (cria planos e shift templates)
npm run prisma:seed

# 3. Executar seeds do ILPI Teste
npm run prisma:seed:ilpiteste:all
```

## 🔑 Credenciais de Acesso

Após executar os seeds, use estas credenciais para login:

**Admin:**
- Email: `admin@ilpiteste.com.br`
- Senha: `Senha@123`

**RT (Responsável Técnico):**
- Email: `rt@ilpiteste.com.br`
- Senha: `Senha@123`

## 📊 Dados Criados

### Tenant
- Nome: TELE ENGENHARIA LTDA
- Slug: `tele-engenharia-ltda`
- Schema: `tenant_tele_engenharia_ltda_9db61a`
- CNPJ: 51.482.599/0001-88
- Status: TRIAL
- Endereço: Rua Antônio Cesarino, 123 - Campinas/SP

### Tenant Profile
- Nome Fantasia: Casa de Repouso Santa Teresinha
- CNES: 1234567
- Capacidade: 20 leitos (declarada e licenciada)
- Natureza Jurídica: EMPRESA_PRIVADA
- Fundação: 22/04/1988

### Escalas (Care Shifts)
- **Padrão Semanal:** Quinzenal (2 semanas de rodízio)
- **Turnos:** Dia 12h e Noite 12h
- **Equipes:** 4 equipes (A Dia, A Noite, B Dia, B Noite)
- **Cobertura:** 24h todos os dias da semana

## ⚠️ Notas Importantes

1. **Pré-requisitos:** Execute `npm run prisma:seed` primeiro para criar planos e shift templates
2. **Idempotência:** Os seeds verificam se dados já existem antes de criar
3. **Ordem:** Respeite a ordem de execução (tenant → users → shifts → residents)
4. **Schema Creation:** O hook automático cria o schema do tenant (aguarda 2s)
5. **Dados Fictícios:** Todos os dados são fictícios e para uso em testes

## 🔧 Troubleshooting

### Erro: "Plano profissional não encontrado"
```bash
npm run prisma:seed
```

### Erro: "Tenant não encontrado"
```bash
npm run prisma:seed:tenant-ilpiteste
```

### Erro: "Usuários não encontrados"
```bash
npm run prisma:seed:users-ilpiteste
```

### Erro: "Shift templates não encontrados"
Verifique se `npm run prisma:seed` foi executado corretamente.

## 📝 Manutenção

Ao adicionar novos dados aos seeds:
1. Mantenha a idempotência (verificar antes de criar)
2. Use console.log para feedback claro
3. Trate erros com mensagens descritivas
4. Atualize este README com as mudanças

---

**Última atualização:** 22/01/2026
**Autor:** @efonseca78 (BR)
