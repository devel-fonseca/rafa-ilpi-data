# Arquitetura de Armazenamento de Arquivos

**Versão:** 2.0.0
**Última atualização:** 15/01/2026

## Visão Geral

Sistema de storage **S3-compatible** usando **MinIO** (desenvolvimento/self-hosted) e **AWS S3** (produção). Arquivos são organizados por tenant, garantindo isolamento físico completo.

### Características Principais

- ✅ **S3-compatible:** API compatível com AWS S3
- ✅ **Isolamento por tenant:** Prefixos dedicados por ILPI
- ✅ **Multi-ambiente:** MinIO (dev) / S3 (prod)
- ✅ **URLs assinadas:** Acesso temporário e seguro
- ✅ **Validação de tipos:** MIME types permitidos por categoria
- ✅ **Limite de tamanho:** Configurável por tipo de arquivo
- ✅ **Gestão de lifecycle:** Expiração automática de URLs

---

## Estrutura de Buckets

### Organização Hierárquica

```
rafa-ilpi-data/                           # Bucket raiz
├── tenants/                              # Prefixo multi-tenant
│   ├── {tenantId}/                       # UUID do tenant
│   │   ├── residents/                    # Residentes
│   │   │   └── {residentId}/
│   │   │       ├── photo.jpg            # Foto 3x4
│   │   │       └── documents/
│   │   │           ├── {docId}_rg.pdf
│   │   │           └── {docId}_cpf.pdf
│   │   ├── clinical-documents/          # Documentos clínicos
│   │   │   └── {residentId}/
│   │   │       └── {documentId}.pdf
│   │   ├── institutional-documents/     # Docs institucionais
│   │   │   ├── alvara_funcionamento.pdf
│   │   │   └── certificado_vigilancia.pdf
│   │   ├── vaccination-certificates/    # Certificados de vacinação
│   │   │   └── {vaccinationId}.pdf
│   │   ├── prescription-pdfs/           # PDFs de prescrições
│   │   │   └── {prescriptionId}.pdf
│   │   └── contract-signatures/         # Contratos assinados
│   │       └── {contractId}.pdf
└── public/                              # Assets públicos (logos, etc)
    └── logos/
        └── {tenantId}/
            └── logo.png
```

### Convenções de Nomenclatura

- **Prefixo obrigatório:** `tenants/{tenantId}/`
- **Subpasta por categoria:** `residents/`, `clinical-documents/`, etc.
- **Nome do arquivo:** `{uuid}_{nome-original}.ext` ou `{uuid}.ext`
- **Sem espaços:** Substituir por `_` ou `-`
- **Lowercase:** Todas as extensões em minúsculo

**Exemplos:**
```
tenants/uuid-abc/residents/uuid-123/photo.jpg
tenants/uuid-abc/residents/uuid-123/documents/uuid-doc_certidao_nascimento.pdf
tenants/uuid-abc/institutional-documents/uuid-alvara_funcionamento.pdf
```

---

## FilesService

**Localização:** `apps/backend/src/files/files.service.ts`

### Métodos Principais

#### 1. Upload de Arquivo

```typescript
async uploadFile(
  file: Express.Multer.File,
  path: string, // Ex: "tenants/{tenantId}/residents/{residentId}/photo.jpg"
): Promise<{ url: string; key: string }> {
  // Validar tipo MIME
  this.validateMimeType(file.mimetype);

  // Validar tamanho
  this.validateFileSize(file.size);

  // Upload para S3/MinIO
  await this.s3Client.send(
    new PutObjectCommand({
      Bucket: this.bucketName,
      Key: path,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  // Retornar URL e key
  return {
    key: path,
    url: await this.getFileUrl(path),
  };
}
```

**Uso no Controller:**

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async uploadResidentPhoto(
  @UploadedFile() file: Express.Multer.File,
  @Param('residentId') residentId: string,
  @CurrentUser() user: JwtPayload,
) {
  const path = `tenants/${user.tenantId}/residents/${residentId}/photo.jpg`;

  const result = await this.filesService.uploadFile(file, path);

  // Atualizar BD com URL
  await this.residentsService.updatePhotoUrl(residentId, result.url);

  return result;
}
```

#### 2. Gerar URL Assinada (Presigned URL)

```typescript
async getFileUrl(
  key: string,
  expiresIn: number = 3600, // 1 hora (padrão)
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: this.bucketName,
    Key: key,
  });

  // Gerar URL assinada válida por expiresIn segundos
  return await getSignedUrl(this.s3Client, command, { expiresIn });
}
```

**Casos de uso:**
- ✅ Download de documentos
- ✅ Exibir fotos de residentes
- ✅ Visualização de PDFs no frontend
- ✅ Compartilhamento temporário

#### 3. Deletar Arquivo

```typescript
async deleteFile(key: string): Promise<void> {
  await this.s3Client.send(
    new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })
  );
}
```

**Soft delete:**
- Arquivo permanece no storage
- Registro no BD marcado como `deletedAt`
- Cleanup periódico via cron job (futuro)

#### 4. Listar Arquivos

```typescript
async listFiles(prefix: string): Promise<string[]> {
  const response = await this.s3Client.send(
    new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix, // Ex: "tenants/uuid-abc/residents/"
    })
  );

  return response.Contents?.map(item => item.Key) || [];
}
```

---

## Validações

### Tipos MIME Permitidos

```typescript
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  images: [
    'image/jpeg',
    'image/png',
    'image/webp',
  ],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  spreadsheets: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
};
```

### Limites de Tamanho

```typescript
const FILE_SIZE_LIMITS: Record<string, number> = {
  photo: 5 * 1024 * 1024,        // 5 MB
  document: 10 * 1024 * 1024,     // 10 MB
  certificate: 5 * 1024 * 1024,   // 5 MB
  prescription: 2 * 1024 * 1024,  // 2 MB
};
```

### Validação no Upload

```typescript
private validateMimeType(mimetype: string, category: string): void {
  const allowed = ALLOWED_MIME_TYPES[category];

  if (!allowed.includes(mimetype)) {
    throw new BadRequestException(
      `Tipo de arquivo não permitido. Permitidos: ${allowed.join(', ')}`
    );
  }
}

private validateFileSize(size: number, category: string): void {
  const limit = FILE_SIZE_LIMITS[category];

  if (size > limit) {
    throw new BadRequestException(
      `Arquivo muito grande. Máximo: ${limit / 1024 / 1024}MB`
    );
  }
}
```

---

## Configuração

### Variáveis de Ambiente

```env
# .env.development (MinIO local)
STORAGE_PROVIDER=minio
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=rafa-ilpi-data
MINIO_USE_SSL=false

# .env.production (AWS S3)
STORAGE_PROVIDER=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET=rafa-ilpi-production
```

### Inicialização do Client

```typescript
// files.service.ts
constructor() {
  const provider = process.env.STORAGE_PROVIDER;

  if (provider === 'minio') {
    this.s3Client = new S3Client({
      region: 'us-east-1', // Região fictícia para MinIO
      endpoint: `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`,
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY,
        secretAccessKey: process.env.MINIO_SECRET_KEY,
      },
      forcePathStyle: true, // Necessário para MinIO
    });
  } else if (provider === 's3') {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  this.bucketName = process.env.STORAGE_PROVIDER === 'minio'
    ? process.env.MINIO_BUCKET
    : process.env.AWS_S3_BUCKET;
}
```

---

## Upload via Frontend

### React Hook Form + Axios

```typescript
const { mutate: uploadPhoto } = useMutation({
  mutationFn: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post(
      `/residents/${residentId}/upload-photo`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );

    return data;
  },
  onSuccess: (data) => {
    toast.success('Foto enviada com sucesso!');
    // Atualizar UI com nova URL
    setPhotoUrl(data.url);
  },
});
```

### Componente de Upload

```tsx
<input
  type="file"
  accept="image/jpeg,image/png,image/webp"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadPhoto(file);
    }
  }}
/>
```

---

## Exibição de Imagens

### Backend: Endpoint de Proxy

```typescript
@Get('residents/:id/photo')
async getResidentPhoto(
  @Param('id') id: string,
  @Res() res: Response,
) {
  const resident = await this.residentsService.findOne(id);

  if (!resident.photoUrl) {
    throw new NotFoundException('Residente não possui foto');
  }

  // Gerar URL assinada válida por 1 hora
  const signedUrl = await this.filesService.getFileUrl(resident.photoKey, 3600);

  // Redirecionar para URL assinada
  res.redirect(signedUrl);
}
```

### Frontend: Exibição

```tsx
<img
  src={`/api/residents/${residentId}/photo`}
  alt="Foto do residente"
  className="w-32 h-32 rounded-full object-cover"
/>
```

**Alternativa (URL direta com cache):**

```tsx
const { data: photoUrl } = useQuery({
  queryKey: ['resident-photo', residentId],
  queryFn: () => api.get(`/files/signed-url?key=${resident.photoKey}`),
  staleTime: 30 * 60 * 1000, // Cache de 30min
});

<img src={photoUrl} alt="Foto" />
```

---

## Segurança

### Isolamento por Tenant

- ✅ **Prefixos obrigatórios:** Sempre `tenants/{tenantId}/`
- ✅ **Validação no upload:** FilesService verifica tenantId do JWT
- ✅ **Impossível acessar:** Arquivos de outro tenant (filtro no BD)

### URLs Assinadas

- ✅ **Temporárias:** Expiram após tempo configurado (padrão: 1h)
- ✅ **Não-guessable:** Incluem signature criptográfica
- ✅ **Revogáveis:** Deletar arquivo = URL inválida

### Prevenção de IDOR

```typescript
// ❌ ERRADO - Vulnerável a IDOR
@Get('files/:key')
async getFile(@Param('key') key: string) {
  return this.filesService.getFileUrl(key); // Qualquer key aceita!
}

// ✅ CORRETO - Validação de ownership
@Get('files/:key')
async getFile(
  @Param('key') key: string,
  @CurrentUser() user: JwtPayload,
) {
  // Extrair tenantId da key
  const tenantIdFromKey = key.split('/')[1];

  // Validar ownership
  if (tenantIdFromKey !== user.tenantId) {
    throw new ForbiddenException('Acesso negado');
  }

  return this.filesService.getFileUrl(key);
}
```

---

## Manutenção e Limpeza

### Cron Job para Arquivos Órfãos

```typescript
@Cron(CronExpression.EVERY_DAY_AT_3AM)
async cleanOrphanedFiles() {
  // Buscar arquivos marcados como deletedAt há mais de 30 dias
  const orphanedDocs = await this.prisma.tenantDocument.findMany({
    where: {
      deletedAt: {
        lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
  });

  for (const doc of orphanedDocs) {
    // Deletar do storage
    await this.filesService.deleteFile(doc.fileKey);

    // Remover registro do BD
    await this.prisma.tenantDocument.delete({ where: { id: doc.id } });
  }

  this.logger.log(`Limpeza: ${orphanedDocs.length} arquivos removidos`);
}
```

---

## Monitoramento

### Métricas Importantes

- **Storage usado por tenant:** `SELECT tenantId, SUM(fileSize) FROM tenant_documents GROUP BY tenantId`
- **Arquivos órfãos:** Arquivos no S3 sem registro no BD
- **URLs expiradas:** Logs de 403 Forbidden em signed URLs
- **Uploads falhados:** Exceções no FilesService

### Dashboard (Futuro)

- Gráfico de uso de storage por tenant
- Alertas para tenants próximos do limite
- Lista de arquivos pesados (>5MB)

---

## Referências

- **AWS S3 SDK v3:** https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/
- **MinIO Documentation:** https://min.io/docs/minio/linux/index.html
- **Presigned URLs:** https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html
- **Multi-Tenancy:** [multi-tenancy.md](./multi-tenancy.md)

---

**Última atualização:** 15/01/2026
**Mantido por:** Dr. Emanuel
