# Runbook Operacional - Backup e Restore (SuperAdmin)

## Escopo
Este runbook cobre:
- Backup full
- Backup por tenant
- Restore full
- Restore por tenant

Sem alterações de schema de banco.

## Pré-requisitos
- Executar comandos a partir de `apps/backend`
- `DATABASE_URL` válido (carregado de `.env` automaticamente)
- Binários disponíveis no host: `pg_dump`, `psql`
- Usuário com acesso `SUPERADMIN` para ações via portal

## Caminhos importantes
- Diretório de backups: `backups/superadmin/full`
- Portal: `/superadmin/backups`

## Comandos CLI

### Backup full
```bash
cd apps/backend
npm run backup:full:create
```

### Listar backups
```bash
cd apps/backend
npm run backup:full:list
```

### Backup por tenant
```bash
cd apps/backend
npm run backup:tenant:create -- --tenantId=<TENANT_UUID>
```

### Restore full por ID
```bash
cd apps/backend
npm run backup:full:restore -- --id=<BACKUP_ID_FULL>
```

### Restore full por arquivo
```bash
cd apps/backend
npm run backup:full:restore -- --file=/caminho/backup.sql
```

### Restore tenant por ID
```bash
cd apps/backend
npm run backup:tenant:restore -- --id=<BACKUP_ID_TENANT>
```

### Restore tenant por arquivo + schema
```bash
cd apps/backend
npm run backup:tenant:restore -- --file=/caminho/backup_tenant.sql --schema=tenant_xxx
```

## Fluxo via Portal SuperAdmin

### Gerar backup
1. Acesse `Backups` no menu lateral.
2. Clique em `Gerar Backup Full`.
3. (Opcional) em `TenantDetails`, clique `Backup do Tenant`.
4. Valide se apareceu nova linha na tabela.

### Restaurar backup
1. Em `Backups`, localize a linha desejada.
2. `Restaurar`:
   - backup `Full`: restauração completa.
   - backup `Tenant`: restauração somente do tenant associado.
3. Confirme no diálogo.
4. Aguarde toast de sucesso/erro.

## Checklist pré-restore (obrigatório)
- Confirmar ID do backup correto.
- Confirmar tipo (`Full` ou `Tenant`).
- Confirmar janela operacional (baixo tráfego).
- Comunicar equipe que haverá impacto de leitura/escrita.

## Checklist pós-restore
- Login com usuário esperado.
- Validar dashboard principal.
- Validar listagem de tenants.
- Validar faturas/backups carregando.
- Verificar logs backend por erros HTTP/DB nos primeiros minutos.

## Resolução rápida de problemas

### `DATABASE_URL não configurada`
- Verificar `apps/backend/.env` com `DATABASE_URL`.

### `schema already exists` (full restore)
- Corrigido no fluxo atual: full restore limpa schemas de aplicação antes de aplicar dump.

### `Backup não encontrado`
- Conferir ID na tela/CLI e executar `npm run backup:full:list`.

### `Falha ao executar pg_dump/psql`
- Verificar instalação dos binários e permissões do usuário do sistema.

## Observações operacionais
- Restore full substitui estado atual do banco.
- Restore tenant impacta apenas o schema do tenant alvo.
- Modal de “Bem-vindo ao plano ativo” não representa cobrança nova por si só (é UI).
