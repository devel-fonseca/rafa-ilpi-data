# ✅ Instalação MinIO - VALIDADA

**Data:** 13/11/2025 08:23 BRT
**Status:** 🟢 OPERACIONAL
**Servidor:** KVM Hostinger (IP: 69.62.91.220)

---

## 📊 Validação Completa

### ✅ Infraestrutura

| Item | Status | Detalhes |
|------|--------|----------|
| Container MinIO | 🟢 Ativo | Nome: `minio` |
| API S3 | 🟢 Online | https://s3.rafalabs.com.br |
| Console Admin | 🟢 Online | https://minio-console.rafalabs.com.br |
| SSL/TLS | 🟢 Válido | Expira: 11/02/2026 |
| DNS | 🟢 Resolvido | s3.rafalabs.com.br → 69.62.91.220 |
| Nginx Proxy | 🟢 Ativo | Reverse proxy configurado |

### ✅ Configuração

| Item | Status | Valor |
|------|--------|-------|
| Bucket Principal | 🟢 Criado | `rafa-ilpi-files` |
| Versioning | 🟢 Habilitado | Sim |
| Encryption | 🟢 Habilitado | SSE-S3 |
| Service Account | 🟢 Criado | `rafa-ilpi-app` |
| Access Keys | 🟢 Geradas | ✓ |

### ✅ Backup e Manutenção

| Item | Status | Configuração |
|------|--------|--------------|
| Script de Backup | 🟢 Criado | `/opt/minio/backup.sh` |
| Cron Job | 🟢 Agendado | Diário às 3h AM |
| Retenção | 🟢 Configurada | 7 dias |
| Local Backups | 🟢 Criado | `/opt/backups/minio` |

### ✅ Testes Realizados

| Teste | Status | Resultado |
|-------|--------|-----------|
| Upload de arquivo | ✅ Passou | Arquivo enviado com sucesso |
| Download de arquivo | ✅ Passou | Download funcionando |
| Console Admin | ✅ Passou | Login e interface OK |
| API Health Check | ✅ Passou | `/minio/health/live` retornou OK |
| SSL/TLS | ✅ Passou | Certificado válido |

---

## 🔐 Credenciais (Armazenadas com Segurança)

**Arquivo local (NÃO commitado):** `.env.credentials`

### Access Keys Geradas:

```
Access Key ID: 2dcc4bb285043da2852e
Secret Access Key: hJWYfy6hQ0TG9Aygwv76evinyO2VF3HzEA+mb7/l
Bucket: rafa-ilpi-files
Endpoint: https://s3.rafalabs.com.br
```

⚠️ **Estas credenciais estão salvas em `.env.credentials` (gitignored)**

---

## 📍 Localização dos Recursos

### No Servidor Hostinger:

```bash
# Arquivos do MinIO
/opt/minio/docker-compose.yml    # Configuração Docker
/opt/minio/data/                 # Dados dos buckets
/opt/minio/backup.sh             # Script de backup

# Backups
/opt/backups/minio/              # Backups diários

# Nginx
/etc/nginx/sites-available/minio # Config Nginx
/etc/nginx/sites-enabled/minio   # Link simbólico

# Certificados SSL
/etc/letsencrypt/live/s3.rafalabs.com.br/
/etc/letsencrypt/live/minio-console.rafalabs.com.br/
```

---

## 🔧 Comandos de Manutenção

### Verificar Status

```bash
# SSH no servidor
ssh root@69.62.91.220

# Ver container
docker ps | grep minio

# Ver logs
docker logs -f minio

# Verificar saúde
curl https://s3.rafalabs.com.br/minio/health/live
```

### Backup Manual

```bash
# Executar backup manualmente
/opt/minio/backup.sh

# Listar backups
ls -lh /opt/backups/minio/
```

### Acessar Console

```bash
# Navegador
https://minio-console.rafalabs.com.br

# Credenciais Admin
Usuário: rafalabs_admin
Senha: [ver .env.credentials]
```

---

## 📊 Capacidade e Limites

### Servidor Atual:

```
Storage Disponível: ~80 GB (após SO e apps)
Bandwidth: 1-2 TB/mês
Performance: Suficiente para 500+ ILPIs
```

### Estimativas de Uso:

```
Por ILPI (média):
- 20 residentes
- 50 arquivos/ILPI
- ~100 MB/ILPI

100 ILPIs = ~10 GB
500 ILPIs = ~50 GB (dentro do limite)
```

### Quando Escalar:

```
❌ Storage > 60 GB → Upgrade servidor ou migrar S3
❌ Bandwidth > 1 TB/mês → Upgrade plano
❌ > 1000 ILPIs → Considerar AWS S3
```

---

## ✅ Próximos Passos

### 1. Atualizar Backend

Editar `apps/backend/.env`:

```bash
# Copiar de .env.credentials:
AWS_S3_ENDPOINT=https://s3.rafalabs.com.br
AWS_S3_BUCKET=rafa-ilpi-files
AWS_ACCESS_KEY_ID=2dcc4bb285043da2852e
AWS_SECRET_ACCESS_KEY=hJWYfy6hQ0TG9Aygwv76evinyO2VF3HzEA+mb7/l
AWS_S3_FORCE_PATH_STYLE=true
```

### 2. Testar Integração

Quando o código estiver pronto:

```bash
cd apps/backend
npm run test:minio  # (será criado)
```

### 3. Monitoramento Contínuo

- [ ] Verificar logs semanalmente
- [ ] Monitorar uso de disco
- [ ] Verificar backups (primeiro do mês)
- [ ] Renovação SSL automática (Let's Encrypt)

---

## 🆘 Troubleshooting

### Se o MinIO parar:

```bash
docker start minio
docker logs minio  # Ver erro
```

### Se o disco encher:

```bash
df -h  # Ver uso
du -sh /opt/minio/data  # Uso do MinIO
# Limpar backups antigos ou upgrade
```

### Se SSL expirar:

```bash
certbot renew --force-renewal
systemctl reload nginx
```

---

## 📞 Suporte

**Documentação:**
- Setup completo: `docs/deployment/minio-hostinger-setup.md`
- Comandos úteis: `docs/deployment/minio-cheatsheet.md`

**Contato:**
- Email: suporte@rafalabs.com.br
- Telefone: (19) 98152-4849

---

## 🎉 Status Final

```
✅ MinIO instalado e operacional
✅ Configuração validada
✅ Credenciais geradas e salvas
✅ Backup automático ativo
✅ SSL configurado e válido
✅ Pronto para integração com backend
```

**Instalado por:** Dr. Emanuel
**Data:** 13/11/2025 08:23 BRT
**Validado por:** Claude (Rafa Labs Assistant)

---

🚀 **Projeto Rafa ILPI - Storage 100% Operacional!**
