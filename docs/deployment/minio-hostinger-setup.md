# 🪣 Guia de Instalação - MinIO no KVM Hostinger

**Projeto:** Rafa ILPI
**Servidor:** KVM Hostinger
**Objetivo:** Configurar MinIO como storage S3-compatible com custo zero

---

## 📋 Pré-requisitos

- ✅ Servidor KVM Hostinger (mínimo 2GB RAM, 40GB storage)
- ✅ Acesso SSH root
- ✅ Domínio configurado (rafalabs.com.br)
- ✅ Docker instalado (ou será instalado)

---

## 🚀 Passo a Passo

### **1. Conectar no Servidor**

```bash
# SSH para o servidor Hostinger
ssh root@seu-ip-hostinger

# Ou se já tiver configurado alias
ssh rafalabs-server
```

---

### **2. Instalar Docker (se não tiver)**

```bash
# Atualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verificar instalação
docker --version

# Habilitar Docker no boot
systemctl enable docker
systemctl start docker

# (Opcional) Instalar Docker Compose
apt install docker-compose -y
docker-compose --version
```

---

### **3. Criar Estrutura de Diretórios**

```bash
# Criar diretórios para MinIO
mkdir -p /opt/minio/data
mkdir -p /opt/minio/config

# Criar diretório para certificados SSL (Let's Encrypt)
mkdir -p /opt/ssl/certs

# Verificar permissões
ls -la /opt/minio/
```

---

### **4. Configurar MinIO com Docker**

#### **Opção A: Docker Run (Simples)**

```bash
docker run -d \
  --name minio \
  --restart unless-stopped \
  -p 9000:9000 \
  -p 9001:9001 \
  -v /opt/minio/data:/data \
  -e "MINIO_ROOT_USER=rafalabs_admin" \
  -e "MINIO_ROOT_PASSWORD=SuaSenhaForte123!@#" \
  minio/minio server /data --console-address ":9001"
```

#### **Opção B: Docker Compose (Recomendado)**

Criar arquivo `/opt/minio/docker-compose.yml`:

```yaml
version: '3.8'

services:
  minio:
    image: minio/minio:latest
    container_name: minio
    restart: unless-stopped
    ports:
      - "9000:9000"  # API
      - "9001:9001"  # Console
    volumes:
      - /opt/minio/data:/data
    environment:
      MINIO_ROOT_USER: rafalabs_admin
      MINIO_ROOT_PASSWORD: SuaSenhaForte123!@#
      MINIO_BROWSER_REDIRECT_URL: https://minio-console.rafalabs.com.br
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

networks:
  default:
    name: rafa-ilpi-network
```

Executar:

```bash
cd /opt/minio
docker-compose up -d

# Verificar logs
docker-compose logs -f minio
```

---

### **5. Verificar MinIO Funcionando**

```bash
# Ver containers rodando
docker ps

# Ver logs do MinIO
docker logs minio

# Testar acesso local
curl http://localhost:9000/minio/health/live
# Deve retornar: {"status":"ok"}
```

---

### **6. Configurar Nginx Reverse Proxy**

#### **Instalar Nginx (se não tiver)**

```bash
apt install nginx -y
systemctl enable nginx
systemctl start nginx
```

#### **Criar configuração para MinIO**

Arquivo: `/etc/nginx/sites-available/minio`

```nginx
# MinIO API (S3-compatible endpoint)
server {
    listen 80;
    server_name s3.rafalabs.com.br;

    # Ignore favicon
    location = /favicon.ico {
        access_log off;
        return 204;
    }

    # MinIO API
    location / {
        proxy_pass http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Para uploads grandes
        client_max_body_size 50M;
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
}

# MinIO Console (Admin UI)
server {
    listen 80;
    server_name minio-console.rafalabs.com.br;

    location / {
        proxy_pass http://localhost:9001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### **Habilitar configuração**

```bash
# Link simbólico
ln -s /etc/nginx/sites-available/minio /etc/nginx/sites-enabled/

# Testar configuração
nginx -t

# Se OK, recarregar
systemctl reload nginx
```

---

### **7. Configurar DNS**

No painel de DNS do seu domínio (rafalabs.com.br), adicione:

```
Tipo: A
Nome: s3
Valor: IP_DO_SEU_SERVIDOR_HOSTINGER
TTL: 3600

Tipo: A
Nome: minio-console
Valor: IP_DO_SEU_SERVIDOR_HOSTINGER
TTL: 3600
```

Aguarde propagação (5-30 minutos).

Testar:

```bash
# No seu computador local
ping s3.rafalabs.com.br
ping minio-console.rafalabs.com.br
```

---

### **8. Configurar SSL com Let's Encrypt**

```bash
# Instalar Certbot
apt install certbot python3-certbot-nginx -y

# Obter certificado para API
certbot --nginx -d s3.rafalabs.com.br

# Obter certificado para Console
certbot --nginx -d minio-console.rafalabs.com.br

# Renovação automática já está configurada
certbot renew --dry-run
```

Agora você terá:
- ✅ **API:** https://s3.rafalabs.com.br
- ✅ **Console:** https://minio-console.rafalabs.com.br

---

### **9. Criar Bucket Inicial**

#### **Opção A: Via Console Web**

1. Acesse: https://minio-console.rafalabs.com.br
2. Login com:
   - User: `rafalabs_admin`
   - Password: `SuaSenhaForte123!@#`
3. Vá em **Buckets** → **Create Bucket**
4. Nome: `rafa-ilpi-files`
5. Versioning: **Enabled**
6. Encryption: **Enabled (SSE-S3)**

#### **Opção B: Via CLI (MinIO Client)**

```bash
# Instalar mc (MinIO Client)
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
mv mc /usr/local/bin/

# Configurar alias
mc alias set rafalabs https://s3.rafalabs.com.br rafalabs_admin 'SuaSenhaForte123!@#'

# Criar bucket
mc mb rafalabs/rafa-ilpi-files

# Habilitar versioning
mc version enable rafalabs/rafa-ilpi-files

# Listar buckets
mc ls rafalabs
```

---

### **10. Configurar Políticas de Segurança**

#### **Política de Bucket (apenas autenticado)**

```bash
# Criar arquivo policy.json
cat > /tmp/policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::rafa-ilpi-files/*"],
      "Condition": {
        "StringEquals": {
          "s3:ExistingObjectTag/tenant": ["authenticated"]
        }
      }
    }
  ]
}
EOF

# Aplicar política
mc anonymous set-json /tmp/policy.json rafalabs/rafa-ilpi-files
```

---

### **11. Criar Usuário de Aplicação (Access Keys)**

```bash
# Via Console: Identity → Service Accounts → Create Service Account

# Ou via CLI:
mc admin user add rafalabs rafa-ilpi-app 'SenhaDoApp123!@#'

# Criar access key
mc admin user svcacct add rafalabs rafa-ilpi-app

# Copie o Access Key e Secret Key gerados!
```

**Anote:**
- ✅ **Access Key:** `xxxxxxxxxxxxx`
- ✅ **Secret Key:** `yyyyyyyyyyyyy`

---

### **12. Testar Upload**

```bash
# Upload de teste
echo "Hello MinIO!" > test.txt

mc cp test.txt rafalabs/rafa-ilpi-files/test.txt

# Listar arquivos
mc ls rafalabs/rafa-ilpi-files/

# Download
mc cp rafalabs/rafa-ilpi-files/test.txt test-download.txt
cat test-download.txt
```

---

### **13. Configurar Backup Automático**

Criar script: `/opt/minio/backup.sh`

```bash
#!/bin/bash

BACKUP_DIR="/opt/backups/minio"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="minio_backup_${DATE}.tar.gz"

# Criar diretório
mkdir -p $BACKUP_DIR

# Backup dos dados
tar -czf ${BACKUP_DIR}/${BACKUP_FILE} /opt/minio/data

# Manter apenas últimos 7 dias
find $BACKUP_DIR -name "minio_backup_*.tar.gz" -mtime +7 -delete

echo "Backup concluído: ${BACKUP_FILE}"
```

Tornar executável e adicionar ao cron:

```bash
chmod +x /opt/minio/backup.sh

# Adicionar ao crontab (backup diário às 3h)
crontab -e

# Adicionar linha:
0 3 * * * /opt/minio/backup.sh >> /var/log/minio-backup.log 2>&1
```

---

### **14. Monitoramento**

```bash
# Ver uso de disco
mc admin info rafalabs

# Ver estatísticas
mc stat rafalabs/rafa-ilpi-files/

# Logs do MinIO
docker logs -f minio

# Ver espaço em disco do servidor
df -h
```

---

## 🔐 Credenciais para o .env da Aplicação

Após a instalação, atualize o `.env` do backend:

```bash
# Storage
STORAGE_TYPE=s3

# MinIO (S3-compatible)
AWS_REGION=us-east-1
AWS_S3_BUCKET=rafa-ilpi-files
AWS_S3_ENDPOINT=https://s3.rafalabs.com.br
AWS_S3_FORCE_PATH_STYLE=true

# Credenciais (do Service Account criado)
AWS_ACCESS_KEY_ID=sua-access-key-aqui
AWS_SECRET_ACCESS_KEY=sua-secret-key-aqui
```

---

## ✅ Checklist de Verificação

- [ ] MinIO rodando (docker ps)
- [ ] Acesso ao console: https://minio-console.rafalabs.com.br
- [ ] API acessível: https://s3.rafalabs.com.br
- [ ] Bucket `rafa-ilpi-files` criado
- [ ] Versioning habilitado
- [ ] SSL configurado (certificados válidos)
- [ ] Usuário de aplicação criado
- [ ] Access Keys anotadas
- [ ] Backup automático configurado
- [ ] Teste de upload/download OK

---

## 🆘 Troubleshooting

### **Problema: Container não inicia**

```bash
docker logs minio
# Ver erro específico
```

### **Problema: Não consigo acessar o console**

```bash
# Verificar portas abertas
netstat -tulpn | grep 9001

# Verificar Nginx
nginx -t
systemctl status nginx

# Ver logs Nginx
tail -f /var/log/nginx/error.log
```

### **Problema: DNS não resolve**

```bash
# Verificar propagação DNS
nslookup s3.rafalabs.com.br
dig s3.rafalabs.com.br

# Aguardar propagação (até 30min)
```

### **Problema: SSL não funciona**

```bash
# Verificar certificados
certbot certificates

# Renovar manualmente
certbot renew --force-renewal
```

---

## 📞 Suporte

Se tiver dúvidas:
- 📧 Email: suporte@rafalabs.com.br
- 📱 Telefone: (19) 98152-4849

---

## 📚 Referências

- [MinIO Documentation](https://min.io/docs/)
- [MinIO Client (mc)](https://min.io/docs/minio/linux/reference/minio-mc.html)
- [AWS S3 Compatibility](https://min.io/product/s3-compatibility)

---

**Última atualização:** 13/11/2025
**Autor:** Dr. Emanuel - Rafa Labs
