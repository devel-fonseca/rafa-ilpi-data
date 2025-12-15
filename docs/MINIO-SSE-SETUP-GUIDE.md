# Guia de Configuração: MinIO Server-Side Encryption (SSE)

**Data:** 13/12/2025
**Responsável:** Emanuel (Dr. E.)
**Servidor:** Hostinger KVM - https://s3.rafalabs.com.br

---

## 🎯 Objetivo

Habilitar criptografia automática (AES-256) em todos os arquivos armazenados no MinIO, garantindo conformidade com LGPD Art. 46 (proteção de dados sensíveis de saúde).

---

## 🔑 Passo 1: Gerar Master Key Segura

**No seu computador local** (já feito):

```bash
# MinIO requer chave em BASE64 (não hex!)
openssl rand -base64 32
```

**Chave gerada:**
```
0aviGkCAbHl4mThrijtrOFIBTGW1QsNVnrSeTCrCPSM=
```

⚠️ **IMPORTANTE**:
- Esta chave é CRÍTICA. Perda da chave = perda de TODOS os arquivos criptografados.
- MinIO aceita **base64**, não hex (256 bits = 32 bytes = ~44 chars base64)

---

## 📦 Passo 2: Acessar Servidor MinIO via SSH

```bash
ssh root@seu-servidor-hostinger.com
# ou
ssh usuario@s3.rafalabs.com.br
```

---

## 🐳 Passo 3: Localizar Docker Compose do MinIO

```bash
# Procurar docker-compose do MinIO
cd /opt/minio  # ou o diretório onde está instalado
# ou
find / -name "docker-compose.yml" -type f 2>/dev/null | grep minio
```

---

## 🔧 Passo 4: Editar docker-compose.yml do MinIO

```bash
nano docker-compose.yml  # ou vim
```

**Configuração ANTES** (exemplo típico):

```yaml
version: '3.8'

services:
  minio:
    image: minio/minio:latest
    container_name: minio
    restart: unless-stopped
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: your-password
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"

volumes:
  minio_data:
```

**Configuração DEPOIS** (com SSE habilitado):

```yaml
version: '3.8'

services:
  minio:
    image: minio/minio:latest
    container_name: minio
    restart: unless-stopped
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: your-password

      # ===== CRIPTOGRAFIA SSE =====
      # Habilitar criptografia automática (chave em BASE64)
      MINIO_KMS_SECRET_KEY: "rafa-ilpi-key:0aviGkCAbHl4mThrijtrOFIBTGW1QsNVnrSeTCrCPSM="

      # Opcional: Forçar criptografia em todos os uploads
      # MINIO_API_ENCRYPTED_HEADERS: "x-amz-server-side-encryption:AES256"

    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"

volumes:
  minio_data:
```

---

## 📝 Detalhes da Configuração

### Formato da Master Key

```
MINIO_KMS_SECRET_KEY: "nome-da-chave:chave-base64"
```

- **nome-da-chave**: Identificador (ex: `rafa-ilpi-key`)
- **chave-base64**: 32 bytes em base64 (~44 caracteres, termina com `=`)

### Opções Adicionais

```yaml
# Forçar criptografia (rejeitar uploads sem SSE)
MINIO_API_ENCRYPTED: "on"

# Algoritmo padrão (AES256 ou AES256-GCM)
MINIO_KMS_SECRET_KEY_CIPHER: "AES256-GCM"
```

---

## 🔄 Passo 5: Reiniciar Container MinIO

```bash
# Parar container
docker-compose down

# Iniciar com nova configuração
docker-compose up -d

# Verificar logs
docker-compose logs -f minio
```

**Logs esperados (sucesso):**
```
MinIO Object Storage Server
Copyright: 2015-2025 MinIO, Inc.
License: GNU AGPLv3 - https://www.gnu.org/licenses/agpl-3.0.html
Version: RELEASE.2024-XX-XX

Status:         1 Online, 0 Offline.
KMS:            Encryption enabled (AES-256-GCM)
Console:        http://0.0.0.0:9001
```

Se aparecer `KMS: Encryption enabled` ✅ está funcionando!

---

## 🧪 Passo 6: Testar Criptografia

### Teste 1: Upload via MinIO Console

1. Acesse `https://s3.rafalabs.com.br:9001` (ou seu console)
2. Login com credenciais root
3. Upload de um arquivo de teste
4. Verificar no servidor:

```bash
# Entrar no container
docker exec -it minio sh

# Verificar arquivo no disco
cd /data/rafa-ilpi-files
ls -lah

# Tentar ler arquivo (deve estar criptografado - lixo binário)
head -c 100 nome-do-arquivo.pdf
# Output esperado: caracteres ilegíveis/binários
```

### Teste 2: Upload via Aplicação Rafa ILPI

No Rafa ILPI (localhost), fazer upload de um documento:
- Foto de residente
- Receita médica
- Documento qualquer

Verificar no servidor que arquivo está criptografado.

---

## 🔐 Passo 7: Backup da Master Key

⚠️ **CRÍTICO - NÃO PULE ESTE PASSO**

### Opção A: Backup em Cofre Físico

1. Imprimir chave em papel:
```
MINIO ENCRYPTION KEY - RAFA ILPI
Criado: 13/12/2025
Formato: base64 (32 bytes)
Chave: 0aviGkCAbHl4mThrijtrOFIBTGW1QsNVnrSeTCrCPSM=
```

2. Guardar em **cofre físico** com acesso restrito

### Opção B: Password Manager Empresarial

- 1Password (Empresarial)
- Bitwarden (Self-hosted ou Cloud)
- LastPass (Teams)

**Cadastrar como:**
- Título: `MinIO Master Encryption Key - Rafa ILPI Produção`
- Usuário: `rafa-ilpi-key`
- Senha: `0aviGkCAbHl4mThrijtrOFIBTGW1QsNVnrSeTCrCPSM=`
- Notas: Data: 13/12/2025, Formato: base64, Servidor: s3.rafalabs.com.br

### Opção C: Secrets Manager (Cloud)

Se usar AWS/Azure/GCP futuramente:
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager

---

## 📋 Checklist de Validação

Após configuração, confirmar:

- [ ] Container MinIO reiniciou sem erros
- [ ] Logs mostram `KMS: Encryption enabled`
- [ ] Upload via console funciona
- [ ] Upload via aplicação Rafa funciona
- [ ] Arquivo no disco está criptografado (lixo binário)
- [ ] Download via aplicação funciona (arquivo descriptografado automaticamente)
- [ ] Master key foi backupeada em local seguro
- [ ] Documentado em `docs/LGPD-DATA-SECURITY-IMPLEMENTATION.md`

---

## 🔄 Rotação de Chaves (Anual ou Comprometimento)

**Quando rotacionar:**
- Anualmente (boas práticas)
- Se houver suspeita de comprometimento
- Mudança de equipe com acesso ao servidor

**Processo:**

1. Gerar nova chave:
```bash
openssl rand -base64 32
```

2. Adicionar nova chave sem remover antiga:
```yaml
MINIO_KMS_SECRET_KEY: "rafa-ilpi-key-v2:nova-chave-hex,rafa-ilpi-key:chave-antiga-hex"
```

3. Re-criptografar objetos existentes (script):
```bash
# MinIO Client (mc)
mc alias set myminio https://s3.rafalabs.com.br access-key secret-key

# Re-encrypt bucket
mc encrypt set sse-s3 myminio/rafa-ilpi-files --recursive
```

4. Após re-criptografia completa, remover chave antiga

---

## 🚨 Troubleshooting

### Erro: Container não inicia após adicionar MINIO_KMS_SECRET_KEY

**Causa:** Formato incorreto da chave

**Solução:**
```bash
# Verificar formato (deve ter ~44 caracteres base64 terminando em =)
echo "0aviGkCAbHl4mThrijtrOFIBTGW1QsNVnrSeTCrCPSM=" | wc -c
# Deve retornar: 45 (44 chars + newline)

# Verificar se é base64 válido
echo "0aviGkCAbHl4mThrijtrOFIBTGW1QsNVnrSeTCrCPSM=" | base64 -d | wc -c
# Deve retornar: 32 (bytes)

# Verificar sintaxe no docker-compose
docker-compose config
```

### Erro: Arquivos antigos não estão criptografados

**Esperado:** SSE só criptografa novos uploads

**Solução:** Migrar arquivos existentes:
```bash
# Via MinIO Client
mc cp --recursive --encrypt myminio/bucket-old myminio/bucket-new
```

### Erro: Download retorna arquivo criptografado (lixo binário)

**Causa:** Aplicação não está usando credenciais corretas ou endpoint HTTPS

**Solução:** Verificar `.env` no backend:
```bash
AWS_S3_ENDPOINT=https://s3.rafalabs.com.br
AWS_ACCESS_KEY_ID=2dcc4bb285043da2852e
AWS_SECRET_ACCESS_KEY=hJWYfy6hQ0TG9Aygwv76evinyO2VF3HzEA+mb7/l
```

---

## 📊 Impacto na Performance

**Overhead esperado:**
- CPU: +5-10% (durante upload/download)
- Throughput: ~95% da velocidade sem criptografia
- Latência: +10-20ms por operação

**Mitigação:**
- Usar SSD no servidor (já deve ter)
- Otimizar tamanho de chunks
- Cache de metadados

---

## ⚙️ Configuração Condicional SSE-C (Dev vs Produção)

### 🔴 Problema: SSE-C Requer HTTPS

**Erro comum em desenvolvimento:**
```
InvalidRequest: Requests specifying Server Side Encryption with Customer
provided keys must be made over a secure connection.
```

**Causa raiz:**

- SSE-C (Server-Side Encryption with Customer-provided keys) **obrigatoriamente requer conexão HTTPS**
- Ambiente de desenvolvimento local usa HTTP (localhost)
- MinIO rejeita requisições SSE-C via HTTP por segurança

### ✅ Solução: Criptografia Condicional por Ambiente

Implementamos flag de configuração no `.env` do backend:

```bash
# apps/backend/.env

# MinIO SSE-C (Server-Side Encryption with Customer-provided keys)
# LGPD - Camada 2: Criptografia de arquivos em repouso
# ATENÇÃO: SSE-C requer conexão HTTPS! Desabilitar em dev local (HTTP)
# Produção (s3.rafalabs.com.br com HTTPS): true
# Desenvolvimento local (localhost sem HTTPS): false
MINIO_USE_ENCRYPTION=false
```

### 🎯 Valores da Flag por Ambiente

| Ambiente | `MINIO_USE_ENCRYPTION` | Conexão MinIO | SSE-C Ativo | Arquivos Criptografados |
|----------|------------------------|---------------|-------------|-------------------------|
| **Desenvolvimento** | `false` | HTTP (localhost) | ❌ Não | ❌ Não |
| **Produção** | `true` | HTTPS (s3.rafalabs.com.br) | ✅ Sim | ✅ Sim |

### 🔧 Implementação no FilesService

Três métodos foram modificados para verificar a flag antes de aplicar SSE-C:

#### 1. `uploadFile()` - Upload genérico de arquivos

```typescript
// apps/backend/src/files/files.service.ts (linhas ~256-271)

// Se categoria sensível E criptografia habilitada, adicionar SSE-C
// SSE-C requer HTTPS - desabilitar em dev local, habilitar em prod
const useEncryption = this.configService.get<string>('MINIO_USE_ENCRYPTION') === 'true';

if (needsEncryption && useEncryption) {
  const encryptionKey = this.generateEncryptionKey(tenantId);
  const encryptionKeyMD5 = createHash('md5').update(encryptionKey).digest('base64');

  baseCommand.SSECustomerAlgorithm = 'AES256';
  baseCommand.SSECustomerKey = encryptionKey.toString('base64');
  baseCommand.SSECustomerKeyMD5 = encryptionKeyMD5;

  this.logger.log(`Uploading ENCRYPTED file (${category}): ${filePath}`);
} else if (needsEncryption && !useEncryption) {
  this.logger.warn(`SSE-C disabled - uploading UNENCRYPTED file (${category}): ${filePath}`);
}
```

#### 2. `processPhotoWithThumbnails()` - Fotos com variantes

```typescript
// apps/backend/src/files/files.service.ts (linhas ~141-180)

// Verificar se criptografia SSE-C está habilitada
const useEncryption = this.configService.get<string>('MINIO_USE_ENCRYPTION') === 'true';

// Gerar chave de criptografia para fotos (dado biométrico sensível)
const encryptionKey = useEncryption ? this.generateEncryptionKey(tenantId) : null;
const encryptionKeyMD5 = encryptionKey ? createHash('md5').update(encryptionKey).digest('base64') : null;

for (const variant of variants) {
  // ... processamento de imagem ...

  // Preparar comando base
  const uploadCommand: any = {
    Bucket: this.bucket,
    Key: variantPath,
    Body: processed,
    ContentType: 'image/webp',
  };

  // Adicionar SSE-C apenas se habilitado
  if (useEncryption && encryptionKey && encryptionKeyMD5) {
    uploadCommand.SSECustomerAlgorithm = 'AES256';
    uploadCommand.SSECustomerKey = encryptionKey.toString('base64');
    uploadCommand.SSECustomerKeyMD5 = encryptionKeyMD5;
  }

  await this.s3Client.send(new PutObjectCommand(uploadCommand));
  this.logger.log(`Uploaded ${useEncryption ? 'ENCRYPTED' : 'UNENCRYPTED'} thumbnail: ${variantPath}`);
}
```

#### 3. `getFileUrl()` - Geração de URLs assinadas

```typescript
// apps/backend/src/files/files.service.ts (linhas ~342-352)

// Se arquivo criptografado E criptografia habilitada, adicionar chaves SSE-C
const useEncryption = this.configService.get<string>('MINIO_USE_ENCRYPTION') === 'true';

if (tenantId && category && this.requiresEncryption(category) && useEncryption) {
  const encryptionKey = this.generateEncryptionKey(tenantId);
  const encryptionKeyMD5 = createHash('md5').update(encryptionKey).digest('base64');

  commandParams.SSECustomerAlgorithm = 'AES256';
  commandParams.SSECustomerKey = encryptionKey.toString('base64');
  commandParams.SSECustomerKeyMD5 = encryptionKeyMD5;
}
```

### 🚀 Deploy em Produção

Ao fazer deploy para produção, **OBRIGATORIAMENTE** ajustar `.env`:

```bash
# ❌ DESENVOLVIMENTO
MINIO_USE_ENCRYPTION=false

# ✅ PRODUÇÃO
MINIO_USE_ENCRYPTION=true
```

### ⚠️ Implicações de Segurança

**Desenvolvimento (HTTP sem SSE-C):**

- ❌ Arquivos **NÃO** são criptografados no MinIO
- ⚠️ Aceitável apenas em ambiente local isolado
- 🔒 Database ainda protegido (campos sensíveis com AES-256-GCM)

**Produção (HTTPS com SSE-C):**

- ✅ Arquivos criptografados com AES-256
- ✅ Conformidade LGPD Art. 46 (dados sensíveis de saúde)
- ✅ Proteção em múltiplas camadas (storage + database)

### 🧪 Validação do Comportamento

**Logs esperados em desenvolvimento:**

```log
[FilesService] SSE-C disabled - uploading UNENCRYPTED file (documents): tenant_123/documents/file.pdf
[FilesService] SSE-C disabled - uploading UNENCRYPTED file (photos): tenant_456/photos/resident_789/original.webp
```

**Logs esperados em produção:**

```log
[FilesService] Uploading ENCRYPTED file (documents): tenant_123/documents/file.pdf
[FilesService] Uploaded ENCRYPTED thumbnail: tenant_456/photos/resident_789/original.webp
```

### 🔍 Troubleshooting

**Problema:** Upload funciona em dev mas falha em produção com erro SSE-C

**Possíveis causas:**

1. ❌ `MINIO_USE_ENCRYPTION=false` em produção (deveria ser `true`)
2. ❌ MinIO endpoint ainda usando HTTP em produção (deveria ser HTTPS)
3. ❌ Certificado SSL expirado/inválido no servidor MinIO

**Verificação:**

```bash
# No backend, verificar conexão MinIO
echo $AWS_S3_ENDPOINT
# Deve retornar: https://s3.rafalabs.com.br (com https://)

# Testar conexão SSL
curl -I https://s3.rafalabs.com.br
# Deve retornar: HTTP/2 200 (sem erros de certificado)
```

---

## 🔗 Próximos Passos

Após SSE configurado:

1. ✅ **Camada 1 (Storage)** - COMPLETO
2. ✅ **Camada 2 (Database)** - COMPLETO (Prisma Middleware)
3. ✅ **Configuração Condicional** - COMPLETO (Dev vs Prod)
4. ⏳ **Camada 3 (Documentação)** - Política de Privacidade

Ver: `docs/LGPD-DATA-SECURITY-IMPLEMENTATION.md`

---

## 📚 Referências

- [MinIO Encryption Guide](https://min.io/docs/minio/linux/operations/server-side-encryption.html)
- [LGPD Art. 46](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [OWASP Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

---

**Desenvolvedor:** Emanuel (Dr. E.) + Claude Sonnet 4.5
**Data:** 13/12/2025
**Status:** ✅ Pronto para Implementação
