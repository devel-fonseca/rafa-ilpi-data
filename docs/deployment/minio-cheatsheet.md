# 🪣 MinIO - Comandos Úteis (Cheat Sheet)

Referência rápida para gerenciar MinIO no servidor Hostinger.

---

## 🐳 Docker

```bash
# Ver status do container
docker ps | grep minio

# Ver logs
docker logs -f minio

# Parar MinIO
docker stop minio

# Iniciar MinIO
docker start minio

# Reiniciar MinIO
docker restart minio

# Remover container (cuidado!)
docker rm -f minio

# Ver uso de recursos
docker stats minio
```

---

## 🔧 MinIO Client (mc)

### **Setup**

```bash
# Instalar mc
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# Configurar alias
mc alias set rafalabs https://s3.rafalabs.com.br ACCESS_KEY SECRET_KEY
```

### **Buckets**

```bash
# Listar buckets
mc ls rafalabs

# Criar bucket
mc mb rafalabs/novo-bucket

# Remover bucket (vazio)
mc rb rafalabs/bucket-vazio

# Remover bucket (com arquivos - cuidado!)
mc rb --force rafalabs/bucket-com-arquivos

# Info do bucket
mc stat rafalabs/rafa-ilpi-files
```

### **Arquivos**

```bash
# Listar arquivos
mc ls rafalabs/rafa-ilpi-files/

# Upload
mc cp arquivo.pdf rafalabs/rafa-ilpi-files/

# Upload recursivo (pasta)
mc cp --recursive ./documentos/ rafalabs/rafa-ilpi-files/documentos/

# Download
mc cp rafalabs/rafa-ilpi-files/arquivo.pdf ./

# Download recursivo
mc cp --recursive rafalabs/rafa-ilpi-files/documentos/ ./documentos/

# Remover arquivo
mc rm rafalabs/rafa-ilpi-files/arquivo.pdf

# Remover pasta
mc rm --recursive rafalabs/rafa-ilpi-files/pasta/

# Copiar entre buckets
mc cp rafalabs/bucket1/arquivo.pdf rafalabs/bucket2/
```

### **Versioning**

```bash
# Habilitar versioning
mc version enable rafalabs/rafa-ilpi-files

# Desabilitar versioning
mc version suspend rafalabs/rafa-ilpi-files

# Listar versões de um arquivo
mc version list rafalabs/rafa-ilpi-files/arquivo.pdf
```

### **Políticas**

```bash
# Ver política do bucket
mc anonymous get rafalabs/rafa-ilpi-files

# Bucket público (leitura)
mc anonymous set download rafalabs/bucket-publico

# Bucket privado
mc anonymous set none rafalabs/rafa-ilpi-files
```

---

## 👥 Usuários e Access Keys

```bash
# Listar usuários
mc admin user list rafalabs

# Criar usuário
mc admin user add rafalabs novo-usuario SenhaForte123!

# Remover usuário
mc admin user remove rafalabs usuario-antigo

# Criar Service Account (access key)
mc admin user svcacct add rafalabs nome-usuario

# Listar service accounts
mc admin user svcacct list rafalabs nome-usuario

# Remover service account
mc admin user svcacct rm rafalabs ACCESS_KEY
```

---

## 📊 Monitoramento

```bash
# Info geral do servidor
mc admin info rafalabs

# Uso de disco
mc admin info rafalabs | grep -A 5 "Drives"

# Estatísticas de bucket
mc du rafalabs/rafa-ilpi-files

# Número de objetos
mc ls --recursive rafalabs/rafa-ilpi-files | wc -l

# Ver logs em tempo real
mc admin logs rafalabs
```

---

## 🔐 Segurança

```bash
# Gerar pre-signed URL (válida por 1 hora)
mc share download --expire 1h rafalabs/rafa-ilpi-files/arquivo.pdf

# Gerar pre-signed URL para upload
mc share upload rafalabs/rafa-ilpi-files/novo-arquivo.pdf

# Verificar SSL/TLS
curl -v https://s3.rafalabs.com.br
```

---

## 💾 Backup

```bash
# Backup completo para outro bucket
mc mirror rafalabs/rafa-ilpi-files rafalabs/rafa-ilpi-backup

# Backup incremental
mc mirror --watch rafalabs/rafa-ilpi-files rafalabs/rafa-ilpi-backup

# Backup para disco local
mc mirror rafalabs/rafa-ilpi-files /backup/minio/

# Restaurar de backup
mc mirror /backup/minio/ rafalabs/rafa-ilpi-files-restored
```

---

## 🧹 Manutenção

```bash
# Limpar versões antigas (lifecycle policy)
mc ilm add --expiry-days 30 rafalabs/rafa-ilpi-files

# Ver regras de lifecycle
mc ilm ls rafalabs/rafa-ilpi-files

# Remover regra de lifecycle
mc ilm rm --id=RULE_ID rafalabs/rafa-ilpi-files

# Verificar integridade
mc admin heal rafalabs
```

---

## 🔄 Nginx

```bash
# Verificar configuração
nginx -t

# Recarregar (sem downtime)
systemctl reload nginx

# Reiniciar
systemctl restart nginx

# Ver logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🔒 SSL/TLS (Let's Encrypt)

```bash
# Ver certificados instalados
certbot certificates

# Renovar manualmente
certbot renew

# Renovar forçado
certbot renew --force-renewal

# Teste de renovação (dry-run)
certbot renew --dry-run
```

---

## 📈 Uso de Disco (Servidor)

```bash
# Espaço em disco
df -h

# Uso do MinIO
du -sh /opt/minio/data

# Arquivos maiores (top 10)
du -ah /opt/minio/data | sort -rh | head -10

# Limpar logs do Docker
docker system prune -a
```

---

## 🆘 Troubleshooting

```bash
# Container parou sozinho
docker logs minio
docker start minio

# Sem espaço em disco
df -h
du -sh /opt/minio/data
# Limpar backups antigos ou upgrade servidor

# Porta já em uso
netstat -tulpn | grep 9000
# Matar processo ou mudar porta

# DNS não resolve
dig s3.rafalabs.com.br
nslookup s3.rafalabs.com.br

# SSL expirado
certbot renew --force-renewal
systemctl reload nginx

# Performance lenta
docker stats minio
htop
# Verificar CPU/RAM/Disco
```

---

## 📞 URLs Importantes

```
API Endpoint:    https://s3.rafalabs.com.br
Console Admin:   https://minio-console.rafalabs.com.br
Health Check:    https://s3.rafalabs.com.br/minio/health/live
```

---

## 🔑 Credenciais (Exemplo - TROCAR!)

```bash
# Admin Console
User: rafalabs_admin
Pass: SuaSenhaForte123!@#

# Application Access Keys
Access Key: AKIAIOSFODNN7EXAMPLE
Secret Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

⚠️ **NUNCA commite credenciais no Git!**

---

**Última atualização:** 13/11/2025
