# Estratégia de Backup - RAFA ILPI

## Status deste documento

Este material permanece como **plano avançado** (roadmap) para execução com equipe dedicada.

Para a operação atual (backup/restore já implementados no projeto), use como referência principal:
- `docs/flows/SUPERADMIN-BACKUP-RESTORE-RUNBOOK.md`

## 📋 Visão Geral

Sistema multi-tenant com dados sensíveis de saúde (LGPD Art. 11) requer estratégia de backup robusta, automatizada e segura.

---

## 🎯 Objetivos

- **RPO (Recovery Point Objective)**: Máximo 1 hora de perda de dados
- **RTO (Recovery Time Objective)**: Restauração em até 4 horas
- **Retenção**: 30 dias (operacional) + 7 anos (legal - dados de saúde)
- **Conformidade**: LGPD + Lei do Prontuário Eletrônico

---

## 🔄 Tipos de Backup

### 1. Backup Completo (Full)
**Frequência**: Semanal (domingos 02:00)
**Método**: `pg_dump` ou `pg_basebackup`
**Destino**: S3 Glacier Deep Archive (custo-benefício)

```bash
#!/bin/bash
# backup-full.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/full"
S3_BUCKET="s3://rafa-ilpi-backups-prod"

# Dump completo com compressão
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --format=custom \
  --compress=9 \
  --file="${BACKUP_DIR}/full_${TIMESTAMP}.dump"

# Criptografar antes de enviar
openssl enc -aes-256-cbc -salt \
  -in "${BACKUP_DIR}/full_${TIMESTAMP}.dump" \
  -out "${BACKUP_DIR}/full_${TIMESTAMP}.dump.enc" \
  -pass env:BACKUP_ENCRYPTION_KEY

# Upload para S3 com lifecycle
aws s3 cp "${BACKUP_DIR}/full_${TIMESTAMP}.dump.enc" \
  "${S3_BUCKET}/full/" \
  --storage-class GLACIER_DEEP_ARCHIVE

# Verificar integridade
md5sum "${BACKUP_DIR}/full_${TIMESTAMP}.dump" > "${BACKUP_DIR}/full_${TIMESTAMP}.md5"
```

### 2. Backup Incremental
**Frequência**: Diário (01:00)
**Método**: WAL archiving (Write-Ahead Log)
**Destino**: S3 Standard

```bash
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://rafa-ilpi-wal/%f'
archive_timeout = 300  # 5 minutos
```

### 3. Backup por Tenant (Export Seletivo)
**Frequência**: Sob demanda + diário para tenants críticos
**Método**: CSV estruturado (como fizemos agora!)
**Destino**: S3 + cópia local criptografada

```typescript
// apps/backend/src/backup/tenant-backup.service.ts

@Injectable()
export class TenantBackupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Client,
  ) {}

  async backupTenant(tenantId: string, format: 'csv' | 'json' | 'sql' = 'csv') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupDir = `/tmp/backup_${tenantId}_${timestamp}`

    // 1. Criar diretório
    await fs.mkdir(backupDir, { recursive: true })

    // 2. Exportar dados na ordem correta (respeitando FK)
    const exportOrder = [
      { table: 'tenants', filename: '01_tenant.csv' },
      { table: 'users', filename: '02_users.csv' },
      { table: 'user_profiles', filename: '03_user_profiles.csv' },
      { table: 'residents', filename: '04_residents.csv' },
      { table: 'daily_records', filename: '05_daily_records.csv' },
      { table: 'prescriptions', filename: '06_prescriptions.csv' },
      { table: 'medications', filename: '07_medications.csv' },
      { table: 'vital_signs', filename: '08_vital_signs.csv' },
      { table: 'beds', filename: '09_beds.csv' },
      { table: 'buildings', filename: '10_buildings.csv' },
    ]

    for (const { table, filename } of exportOrder) {
      await this.exportTableToCSV(table, tenantId, `${backupDir}/${filename}`)
    }

    // 3. Criar README com metadados
    await this.createBackupReadme(tenantId, backupDir)

    // 4. Compactar
    const tarFile = `${backupDir}.tar.gz`
    await execAsync(`tar -czf ${tarFile} -C ${backupDir} .`)

    // 5. Calcular checksum
    const checksum = await this.calculateMD5(tarFile)
    await fs.writeFile(`${tarFile}.md5`, checksum)

    // 6. Criptografar
    const encFile = `${tarFile}.enc`
    await this.encryptFile(tarFile, encFile)

    // 7. Upload para S3
    await this.uploadToS3(encFile, tenantId, timestamp)

    // 8. Limpar arquivos temporários
    await fs.rm(backupDir, { recursive: true })
    await fs.rm(tarFile)

    return {
      tenantId,
      timestamp,
      checksum,
      size: (await fs.stat(encFile)).size,
      location: `s3://rafa-ilpi-backups-prod/tenants/${tenantId}/${timestamp}/`,
    }
  }

  private async exportTableToCSV(table: string, tenantId: string, filepath: string) {
    // Usar COPY TO para performance
    const query = `
      COPY (
        SELECT * FROM ${table}
        WHERE "tenantId" = $1
        ORDER BY "createdAt"
      ) TO STDOUT WITH CSV HEADER
    `

    const stream = await this.prisma.$queryRawUnsafe(query, tenantId)
    await pipeline(stream, fs.createWriteStream(filepath))
  }

  private async encryptFile(source: string, dest: string) {
    const key = process.env.BACKUP_ENCRYPTION_KEY
    await execAsync(
      `openssl enc -aes-256-cbc -salt -in ${source} -out ${dest} -pass env:BACKUP_ENCRYPTION_KEY`
    )
  }
}
```

---

## 📅 Agenda de Backups

| Tipo | Frequência | Horário | Retenção | Storage Class |
|------|-----------|---------|----------|---------------|
| **Full** | Semanal | Dom 02:00 | 30 dias + 7 anos* | Glacier Deep Archive |
| **Incremental (WAL)** | Contínuo | - | 30 dias | S3 Standard |
| **Tenant Export** | Diário | 01:00 | 90 dias | S3 Intelligent-Tiering |
| **Snapshot RDS** | Diário | 03:00 | 30 dias | AWS Automated |

\* **7 anos**: Apenas para dados de saúde (compliance legal)

---

## 🔐 Segurança

### Criptografia em Repouso
- **Método**: AES-256-CBC
- **Chave**: Armazenada no AWS Secrets Manager
- **Rotação**: Trimestral

```bash
# Criptografar
openssl enc -aes-256-cbc -salt -in backup.dump -out backup.dump.enc \
  -pass pass:$(aws secretsmanager get-secret-value --secret-id backup-key --query SecretString --output text)

# Descriptografar
openssl enc -aes-256-cbc -d -in backup.dump.enc -out backup.dump \
  -pass pass:$(aws secretsmanager get-secret-value --secret-id backup-key --query SecretString --output text)
```

### Criptografia em Trânsito
- **S3**: HTTPS obrigatório
- **Postgres**: SSL/TLS obrigatório

### Controle de Acesso
- **IAM Policies**: Least privilege
- **Bucket Policy**: Apenas IPs autorizados + VPN
- **MFA**: Obrigatório para delete

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:DeleteObject",
      "Resource": "arn:aws:s3:::rafa-ilpi-backups-prod/*",
      "Condition": {
        "BoolIfExists": {
          "aws:MultiFactorAuthPresent": "false"
        }
      }
    }
  ]
}
```

---

## ♻️ Lifecycle Policies (S3)

```yaml
# S3 Lifecycle Configuration
Rules:
  - Id: TransitionOldBackups
    Status: Enabled
    Prefix: full/
    Transitions:
      - Days: 7
        StorageClass: GLACIER
      - Days: 90
        StorageClass: GLACIER_DEEP_ARCHIVE

  - Id: ExpireIncrementalBackups
    Status: Enabled
    Prefix: incremental/
    Expiration:
      Days: 30

  - Id: RetainHealthDataLongTerm
    Status: Enabled
    Prefix: tenants/
    Tags:
      - Key: DataType
        Value: HealthRecords
    Transitions:
      - Days: 30
        StorageClass: GLACIER
      - Days: 365
        StorageClass: GLACIER_DEEP_ARCHIVE
    Expiration:
      Days: 2555  # 7 anos
```

---

## 🧪 Testes de Restauração

### Teste Mensal (1º domingo de cada mês)
```bash
#!/bin/bash
# test-restore.sh

# 1. Baixar backup mais recente
aws s3 cp s3://rafa-ilpi-backups-prod/full/latest.dump.enc /tmp/

# 2. Descriptografar
openssl enc -aes-256-cbc -d -in /tmp/latest.dump.enc -out /tmp/latest.dump

# 3. Criar banco temporário
createdb -h localhost -U postgres rafa_ilpi_restore_test

# 4. Restaurar
pg_restore -h localhost -U postgres -d rafa_ilpi_restore_test /tmp/latest.dump

# 5. Validações
psql -h localhost -U postgres -d rafa_ilpi_restore_test -c "
  SELECT
    (SELECT COUNT(*) FROM tenants) as tenants,
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM residents) as residents,
    (SELECT COUNT(*) FROM daily_records) as records
"

# 6. Teste de login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# 7. Limpar
dropdb -h localhost -U postgres rafa_ilpi_restore_test
rm /tmp/latest.dump*
```

**Documentar resultado**:
- ✅ Tempo de restauração
- ✅ Integridade dos dados (checksums)
- ✅ Funcionalidade (login OK)
- ❌ Problemas encontrados

---

## 🚨 Recuperação de Desastres

### Cenário 1: Corrupção de Dados (1 tenant)
**Solução**: Restaurar backup específico do tenant

```bash
# 1. Baixar backup do tenant
aws s3 cp s3://rafa-ilpi-backups-prod/tenants/TENANT_ID/latest.tar.gz.enc /tmp/

# 2. Descriptografar e descompactar
openssl enc -aes-256-cbc -d -in /tmp/latest.tar.gz.enc -out /tmp/latest.tar.gz
tar -xzf /tmp/latest.tar.gz -C /tmp/restore/

# 3. Importar (como fizemos hoje!)
./scripts/import-tenant-backup.sh /tmp/restore/
```

**RTO**: 30 minutos

### Cenário 2: Perda Total do Banco
**Solução**: Restaurar full backup + WAL

```bash
# 1. Restaurar backup base
pg_restore -h NEW_DB_HOST -U postgres -d rafa_ilpi /path/to/full_backup.dump

# 2. Replay WAL logs
# (configuração de recovery.conf)

# 3. Validar integridade
```

**RTO**: 2-4 horas

### Cenário 3: Ransomware / Ataque
**Solução**: Restaurar snapshot RDS + validação

```bash
# 1. Restaurar snapshot AWS RDS
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier rafa-ilpi-restored \
  --db-snapshot-identifier rafa-ilpi-snapshot-TIMESTAMP

# 2. Validar antes de direcionar aplicação
```

**RTO**: 1-2 horas

---

## 📊 Monitoramento

### Métricas Críticas
- ✅ Sucesso/falha de cada backup
- ⏱️ Tempo de execução
- 💾 Tamanho do backup
- 🔍 Checksum validation
- 📅 Última restauração testada

### Alertas (CloudWatch + PagerDuty)
```yaml
Alerts:
  - Name: BackupFailed
    Condition: backup_status == 'failed'
    Severity: Critical
    Notify: team-devops, team-lead

  - Name: BackupTooLarge
    Condition: backup_size > 50GB
    Severity: Warning
    Notify: team-devops

  - Name: NoBackupLast24h
    Condition: last_backup_age > 24h
    Severity: Critical
    Notify: team-devops, cto

  - Name: RestoreTestOverdue
    Condition: last_restore_test > 30d
    Severity: High
    Notify: team-lead
```

---

## 💰 Estimativa de Custos (AWS)

### Cenário: 100 tenants, 50GB dados/tenant

| Item | Quantidade | Custo Mensal |
|------|-----------|--------------|
| **S3 Standard** (WAL) | 500 GB | $11.50 |
| **S3 Glacier** (Full) | 5 TB | $20.00 |
| **S3 Deep Archive** | 50 TB (7 anos) | $50.00 |
| **Data Transfer Out** | 100 GB | $9.00 |
| **RDS Snapshots** | 5 TB | $95.00 |
| **Secrets Manager** | 2 secrets | $0.80 |
| **CloudWatch** | Logs + Metrics | $10.00 |

**Total**: ~$196/mês

**Custo por tenant**: $1.96/mês

---

## 🔧 Automação (Cron + SystemD)

### Backup Full (Semanal)
```bash
# /etc/cron.d/rafa-backup-full
0 2 * * 0 backup /opt/rafa-ilpi/scripts/backup-full.sh >> /var/log/backup-full.log 2>&1
```

### Backup Tenant (Diário)
```bash
# /etc/cron.d/rafa-backup-tenants
0 1 * * * backup /opt/rafa-ilpi/scripts/backup-all-tenants.sh >> /var/log/backup-tenants.log 2>&1
```

### Teste de Restauração (Mensal)
```bash
# /etc/cron.d/rafa-restore-test
0 4 1 * * backup /opt/rafa-ilpi/scripts/test-restore.sh >> /var/log/restore-test.log 2>&1
```

---

## 📝 Checklist de Implementação

### Fase 1: Infraestrutura (Semana 1)
- [ ] Criar bucket S3 com versionamento
- [ ] Configurar lifecycle policies
- [ ] Setup IAM roles e policies
- [ ] Configurar AWS Secrets Manager
- [ ] Habilitar WAL archiving no Postgres

### Fase 2: Scripts de Backup (Semana 2)
- [ ] Script de backup full
- [ ] Script de backup por tenant
- [ ] Script de upload S3
- [ ] Script de criptografia

### Fase 3: Restauração (Semana 3)
- [ ] Script de restore full
- [ ] Script de restore tenant
- [ ] Script de teste automatizado
- [ ] Documentação de procedimentos

### Fase 4: Monitoramento (Semana 4)
- [ ] CloudWatch dashboards
- [ ] Alertas PagerDuty
- [ ] Relatórios semanais
- [ ] Runbook de incidentes

### Fase 5: Testes (Semana 5)
- [ ] Teste de backup full
- [ ] Teste de restore full
- [ ] Teste de backup tenant
- [ ] Teste de restore tenant
- [ ] Simulação de desastre

---

## 📖 Runbook: Restauração de Emergência

### 1. Identificar Problema
```bash
# Verificar logs
tail -f /var/log/postgresql/postgresql.log

# Verificar conectividade
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1"
```

### 2. Avaliar Escopo
- [ ] Um tenant afetado → Restaurar backup do tenant
- [ ] Múltiplos tenants → Restaurar backup full
- [ ] Banco corrompido → Restaurar snapshot RDS

### 3. Comunicar Stakeholders
```
TO: tech@rafalabs.com.br, suporte@rafalabs.com.br
SUBJECT: [URGENTE] Iniciando Restauração de Backup

Detectamos problema no banco de dados às [TIMESTAMP].
Iniciando procedimento de restauração.
ETA de recuperação: [RTO estimado]

Status: https://status.rafalabs.com.br
```

### 4. Executar Restauração
(Seguir scripts apropriados acima)

### 5. Validar
- [ ] Checksums OK
- [ ] Login funcionando
- [ ] Queries respondendo
- [ ] Dados consistentes

### 6. Post-Mortem
- Causa raiz
- Timeline
- Lições aprendidas
- Ações preventivas

---

## 🎓 Treinamento da Equipe

### Simulações Trimestrais
- **Q1**: Restore de tenant único
- **Q2**: Restore full com WAL replay
- **Q3**: Restore de snapshot RDS
- **Q4**: Disaster recovery completo

### Documentação
- Runbooks atualizados
- Vídeos de treinamento
- Acesso de emergência documentado

---

## ✅ Conclusão

Esta estratégia garante:
- ✅ **Conformidade**: LGPD + requisitos legais
- ✅ **Disponibilidade**: RPO 1h / RTO 4h
- ✅ **Segurança**: Criptografia em repouso e trânsito
- ✅ **Custo-Benefício**: ~$2/tenant/mês
- ✅ **Automação**: Zero intervenção manual
- ✅ **Confiabilidade**: Testes mensais obrigatórios

**Próximos Passos**:
1. Aprovar estratégia
2. Provisionar infraestrutura AWS
3. Implementar scripts
4. Testar em staging
5. Deploy em produção
6. Documentar e treinar equipe
