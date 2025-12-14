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

## 🔗 Próximos Passos

Após SSE configurado:

1. ✅ **Camada 1 (Storage)** - COMPLETO
2. ⏳ **Camada 2 (Database)** - Implementar Prisma Middleware
3. ⏳ **Camada 3 (Documentação)** - Política de Privacidade

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
