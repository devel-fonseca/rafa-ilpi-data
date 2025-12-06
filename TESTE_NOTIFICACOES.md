# 🧪 Guia de Teste - Sistema de Notificações

## ✅ Status dos Servidores
- **Backend:** http://localhost:3000 ✅
- **Frontend:** http://localhost:5173 ✅

---

## 📋 Checklist de Testes

### PARTE 1: Verificação da Infraestrutura

#### ✅ 1.1 Backend está rodando
```bash
curl http://localhost:3000/api/health
# Esperado: {"status":"ok"}
```

#### ✅ 1.2 Tabela de notificações foi criada
```bash
cd apps/backend
PGPASSWORD=rafa_pass_dev psql -h localhost -p 5433 -U rafa_user_dev -d rafa_ilpi -c "\d notifications"
```

**Esperado:** Deve mostrar a estrutura da tabela com todos os campos.

#### ✅ 1.3 Enums foram criados
```bash
PGPASSWORD=rafa_pass_dev psql -h localhost -p 5433 -U rafa_user_dev -d rafa_ilpi -c "\dT+ SystemNotificationType"
```

**Esperado:** Deve listar os valores do enum.

---

### PARTE 2: Testar Endpoints da API

#### 🔑 2.1 Obter Token de Autenticação

Primeiro, faça login no frontend e copie o token do localStorage:
1. Abra http://localhost:5173
2. Faça login
3. Abra DevTools (F12) → Console
4. Execute: `localStorage.getItem('access_token')`
5. Copie o token

Ou use este comando direto para fazer login via API:
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seu-email@exemplo.com",
    "password": "sua-senha"
  }' | jq -r '.access_token')

echo "Token: $TOKEN"
```

#### 📊 2.2 Testar Contador de Não Lidas
```bash
curl -s http://localhost:3000/api/notifications/unread/count \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Esperado:**
```json
{
  "count": 0
}
```

#### 📄 2.3 Listar Notificações
```bash
curl -s "http://localhost:3000/api/notifications?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Esperado:**
```json
{
  "data": [],
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 10,
    "totalPages": 0
  }
}
```

#### ➕ 2.4 Criar Notificação de Teste
```bash
curl -s -X POST http://localhost:3000/api/notifications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "PRESCRIPTION_EXPIRED",
    "category": "PRESCRIPTION",
    "severity": "CRITICAL",
    "title": "Teste - Prescrição Vencida",
    "message": "Esta é uma notificação de teste criada manualmente.",
    "actionUrl": "/dashboard/prescricoes"
  }' | jq
```

**Esperado:** Deve retornar a notificação criada com ID, timestamps, etc.

#### 📊 2.5 Verificar Contador Atualizado
```bash
curl -s http://localhost:3000/api/notifications/unread/count \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Esperado:**
```json
{
  "count": 1
}
```

#### ✅ 2.6 Marcar Como Lida
```bash
# Substitua NOTIFICATION_ID pelo ID da notificação criada
curl -s -X PATCH "http://localhost:3000/api/notifications/NOTIFICATION_ID/read" \
  -H "Authorization: Bearer $TOKEN" | jq
```

#### 🔄 2.7 Marcar Todas Como Lidas
```bash
curl -s -X PATCH http://localhost:3000/api/notifications/read-all \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Esperado:**
```json
{
  "count": 1
}
```

---

### PARTE 3: Testar Interface do Usuário

#### 🖼️ 3.1 Testar Dropdown de Notificações

1. Acesse http://localhost:5173
2. Faça login
3. Observe o **sino no header** (canto superior direito)
4. **Badge deve aparecer** com o número de não lidas
5. **Clique no sino** → dropdown deve abrir
6. Verifique:
   - ✅ Tabs (Todas, Prescrições, Vitais, Documentos)
   - ✅ Lista de notificações
   - ✅ Botão "Marcar todas como lidas"
   - ✅ Link "Ver todas as notificações"

#### 📄 3.2 Testar Página Completa

1. Clique em **"Ver todas as notificações"** no dropdown
   - OU acesse diretamente: http://localhost:5173/dashboard/notificacoes
2. Verifique:
   - ✅ Filtro de busca funciona
   - ✅ Filtros de categoria e severidade
   - ✅ Botão "Apenas não lidas"
   - ✅ Paginação (se houver muitas)
   - ✅ Botão de delete (X) em cada notificação
   - ✅ Clicar na notificação navega para `actionUrl`

#### 🔄 3.3 Testar Polling Automático

1. Mantenha a página aberta
2. Em outro terminal, crie uma nova notificação:
```bash
curl -s -X POST http://localhost:3000/api/notifications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "VITAL_SIGN_ABNORMAL_BP",
    "category": "VITAL_SIGN",
    "severity": "WARNING",
    "title": "Teste - Pressão Alta",
    "message": "Teste de polling automático.",
    "actionUrl": "/dashboard"
  }'
```
3. **Aguarde até 15 segundos**
4. O **badge deve atualizar automaticamente** sem reload da página

---

### PARTE 4: Testar Alertas Automáticos

#### 🩺 4.1 Testar Alerta de Sinal Vital Anormal

1. No frontend, vá para um residente
2. Registre um **sinal vital anormal**:
   - PA Sistólica: **180** (>= 140 = anormal)
   - Glicemia: **250** (>= 200 = anormal)
   - Temperatura: **38.8°C** (>= 37.5 = anormal)
3. **Imediatamente** após salvar:
   - Verifique o sino → deve ter nova notificação
   - Abra o dropdown → notificação de "Pressão Arterial Anormal" deve aparecer

#### 📜 4.2 Verificar Notificação Criada no Banco
```bash
PGPASSWORD=rafa_pass_dev psql -h localhost -p 5433 -U rafa_user_dev -d rafa_ilpi \
  -c "SELECT type, severity, title, message FROM notifications ORDER BY \"createdAt\" DESC LIMIT 5;"
```

**Esperado:** Deve mostrar a notificação de sinal vital criada.

---

### PARTE 5: Testar Cron Jobs

#### ⏰ 5.1 Executar Cron Job Manualmente (Desenvolvimento)

Como os cron jobs rodam em horários específicos, vamos testá-los manualmente.

**Opção A - Via Código:**

Adicione temporariamente este endpoint no `notifications.controller.ts`:
```typescript
@Get('test/run-cron-prescriptions')
async testCronPrescriptions() {
  // Chamar diretamente o método do cron
  return { message: 'Cron executado manualmente' }
}
```

**Opção B - Criar Dados de Teste:**

1. Crie uma prescrição vencida no banco:
```bash
PGPASSWORD=rafa_pass_dev psql -h localhost -p 5433 -U rafa_user_dev -d rafa_ilpi
```

```sql
-- Encontrar um residente e tenant
SELECT id, "tenantId", "fullName" FROM residents LIMIT 1;

-- Inserir prescrição vencida (ajuste os UUIDs)
INSERT INTO prescriptions (
  id, "tenantId", "residentId", "prescriptionType",
  "doctorName", "prescriptionDate", "validUntil", "isActive"
) VALUES (
  gen_random_uuid(),
  'TENANT_ID_AQUI',
  'RESIDENT_ID_AQUI',
  'ROTINA',
  'Dr. Teste',
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE - INTERVAL '1 day', -- Vencida ontem
  true
);
```

2. Aguarde até as 7h do dia seguinte OU altere temporariamente o cron para rodar em 1 minuto:
```typescript
// notifications.cron.ts
@Cron('* * * * *') // Executa a cada minuto
```

3. Verifique os logs do backend:
```bash
# Deve aparecer algo como:
# 🔔 Running cron: checkPrescriptionsExpiry
# ✅ Cron checkPrescriptionsExpiry completed: 1 expired notifications created
```

#### 📋 5.2 Verificar Logs dos Cron Jobs

Monitore os logs do backend:
```bash
# No terminal onde o backend está rodando, procure por:
grep "cron" backend.log
# ou
tail -f backend.log | grep "🔔"
```

---

### PARTE 6: Testar Cenários Reais

#### 📊 6.1 Cenário: Prescrição Vencendo

1. Crie uma prescrição que vence em **3 dias**
2. Aguarde o cron rodar (7h) ou execute manualmente
3. Verifique notificação **WARNING** criada
4. Badge no sino deve atualizar

#### 🩺 6.2 Cenário: Sinais Vitais Críticos

1. Registre sinal vital **CRÍTICO**:
   - PA: **200/120** (>= 160 = CRITICAL)
   - SpO2: **85%** (< 88% = CRITICAL)
2. Notificação **CRITICAL** deve ser criada instantaneamente
3. Card da notificação deve ter fundo **vermelho**

#### 📄 6.3 Cenário: Documento Vencido

1. Crie documento com data de validade vencida
2. Aguarde cron das 8h (ou execute manualmente)
3. Notificação de documento vencido deve aparecer

---

### PARTE 7: Testes de Integração

#### 🔗 7.1 Navegação via ActionUrl

1. Clique em uma notificação de prescrição
2. Deve navegar para `/dashboard/prescricoes/{id}`
3. Notificação deve ser marcada como lida automaticamente

#### 🔍 7.2 Filtros e Busca

1. Crie notificações de diferentes categorias
2. Teste filtro de categoria → deve mostrar apenas da categoria selecionada
3. Teste busca → deve filtrar por título/mensagem
4. Teste "Apenas não lidas" → deve ocultar as lidas

#### 📄 7.3 Paginação

1. Crie 25+ notificações
2. Verifique que aparece paginação
3. Navegue entre páginas → deve funcionar

---

## 🐛 Troubleshooting

### Problema: Badge não atualiza
**Solução:** Verifique DevTools > Network > polling de `/notifications/unread/count` a cada 15s

### Problema: Notificação não criada ao registrar sinal vital
**Solução:**
1. Verifique logs do backend para erros
2. Confirme que `VitalSignsModule.onModuleInit()` foi executado
3. Verifique se `notificationsServiceInstance` não é null

### Problema: Cron não executa
**Solução:**
1. Verifique `ScheduleModule.forRoot()` está no app.module
2. Verifique `@nestjs/schedule` está instalado
3. Cheque logs: `grep "cron" backend.log`

### Problema: Erro 401 ao testar API
**Solução:** Token expirado, faça login novamente e obtenha novo token

---

## ✅ Checklist Final

- [ ] Backend rodando sem erros
- [ ] Frontend carrega corretamente
- [ ] Sino aparece no header
- [ ] Badge mostra contador correto
- [ ] Dropdown abre e mostra notificações
- [ ] Polling funciona (atualiza automaticamente)
- [ ] Página completa é acessível
- [ ] Filtros funcionam
- [ ] Marcar como lida funciona
- [ ] Delete funciona
- [ ] Sinal vital anormal cria notificação
- [ ] Navegação via actionUrl funciona
- [ ] Notificações aparecem no banco

---

## 📝 Próximos Passos Após Testes

Se todos os testes passarem:
1. ✅ Sistema está production-ready
2. Fazer commit das alterações
3. Deploy para staging/produção
4. Monitorar logs dos cron jobs
5. Coletar feedback dos usuários

Se houver problemas:
1. Anote os erros encontrados
2. Verifique logs detalhados
3. Relate para ajuste

---

**Boa sorte com os testes! 🚀**
