# Documentos Tiptap para Evoluções Clínicas

## Visão Geral

Sistema de documentos formatados (WYSIWYG) que podem ser criados opcionalmente junto com evoluções clínicas. Os documentos são gerados automaticamente em PDF e armazenados no MinIO/S3.

## Funcionalidades

### 1. Criação de Documentos

- **Opcional**: Switch no formulário de evoluções permite habilitar/desabilitar criação de documento
- **Somente na criação**: Documentos só podem ser criados junto com novas evoluções (não disponível na edição)
- **Campos obrigatórios quando habilitado**:
  - Título/Descrição (mín. 3 caracteres)
  - Conteúdo formatado (mín. 10 caracteres)
- **Campo opcional**: Tipo (Relatório, Pedido de Exame, Parecer, Atestado, Evolução Detalhada, Outro)
- **Preview antes de salvar**: Modal de confirmação exibe preview do PDF gerado
  - Usuário pode **confirmar e salvar** ou **voltar para editar**
  - Preview em iframe com visualização completa do documento
  - Evita erros e permite revisão antes do salvamento definitivo

### 2. Editor WYSIWYG (Tiptap)

**Formatações disponíveis:**
- **Texto**: Negrito, Itálico, Sublinhado
- **Estrutura**: Títulos (H1, H2, H3)
- **Listas**: Marcadores e numeradas
- **Links**: Adicionar/remover hyperlinks

**Componentes:**
- `TiptapEditor`: Componente principal com integração bidirecional
- `EditorToolbar`: Barra de ferramentas com botões de formatação
- Localização: `/apps/frontend/src/components/tiptap/`

### 3. Geração de PDF

**Layout do documento:**

```
┌─────────────────────────────────────────────┐
│ CABEÇALHO INSTITUCIONAL                     │
│ - Logo                                      │
│ - Nome da instituição                       │
│ - CNPJ, CNES, Contato, Endereço            │
├─────────────────────────────────────────────┤
│ Residente: [Nome Completo]                  │
│ Idade: [X anos] | CPF: [XXX.XXX.XXX-XX]    │
│ Data: [DD/MM/YYYY HH:MM]                    │
│                                             │
│        [TÍTULO/DESCRIÇÃO]                   │
│         (centralizado, negrito)             │
│                                             │
│ [Conteúdo formatado do Tiptap]              │
│                                             │
│ [Nome do Profissional]                      │
│ [Data/Hora Completa]                        │
│ Assinatura: _____________________           │
└─────────────────────────────────────────────┘
```

**Biblioteca utilizada:** `@react-pdf/renderer v3.x`

**Vantagens sobre html2pdf.js:**
- ✅ PDF nativo (vetorial) ao invés de captura de tela
- ✅ Texto selecionável e pesquisável
- ✅ Tamanho de arquivo menor
- ✅ Preview perfeito com PDFViewer integrado
- ✅ Sem problemas de renderização em branco
- ✅ Componentes React declarativos

**Configurações:**
- Formato: A4 (210mm x 297mm)
- Orientação: Portrait
- Margens: 10mm (top/bottom), 15mm (left/right)
- Fonte: Helvetica (embutida no PDF)
- Tamanho de fonte: 12px (corpo), 11px (metadados)

### 4. Comportamento com Múltiplas Páginas

**⚠️ IMPORTANTE - Documentos com mais de 1 página:**

O sistema utiliza `html2pdf.js` que possui as seguintes características:

#### ✅ Suporte a Múltiplas Páginas
- **Quebra automática**: O conteúdo é automaticamente distribuído em múltiplas páginas quando excede o tamanho de uma página A4
- **Preservação da formatação**: Negrito, itálico, sublinhado, listas e títulos são mantidos em todas as páginas
- **Quebra inteligente**: A biblioteca tenta evitar quebras no meio de palavras ou elementos

#### ⚠️ Limitações Conhecidas
1. **Cabeçalho institucional**: Aparece apenas na primeira página (não se repete)
2. **Assinatura**: Aparece apenas na última página
3. **Quebra de elementos grandes**:
   - Listas muito longas podem ser cortadas entre páginas
   - Tabelas (se houver) podem ter problemas de quebra
   - Imagens grandes podem ser cortadas
4. **Sem numeração de páginas**: Não há "Página X de Y" automático
5. **Margens consistentes**: As margens são mantidas em todas as páginas (10mm/15mm)

#### 📏 Capacidade Estimada por Página
Com as configurações atuais:
- **Área útil**: ~170mm (altura) x 180mm (largura)
- **Texto normal**: ~45-50 linhas por página
- **Com títulos H1**: ~35-40 linhas por página
- **Com listas**: ~40-45 itens por página

#### 🔧 Recomendações para Documentos Longos
1. **Títulos descritivos**: Use H1/H2 para separar seções visualmente
2. **Listas curtas**: Divida listas muito longas em seções menores
3. **Parágrafos concisos**: Evite blocos de texto muito longos
4. **Evite imagens**: O editor atual não suporta imagens (apenas texto formatado)
5. **Teste antes de salvar**: Visualize o documento antes de criar a evolução

#### 💡 Casos de Uso Recomendados
- ✅ Relatórios de 1-3 páginas
- ✅ Pareceres técnicos concisos
- ✅ Pedidos de exame com justificativa
- ✅ Atestados e declarações
- ⚠️ Evoluções muito detalhadas (>5 páginas)
- ⚠️ Documentos com muitas tabelas complexas

## Armazenamento

### Banco de Dados (PostgreSQL)
**Tabela:** `clinical_note_documents`

**Campos principais:**
- `id`: UUID do documento
- `noteId`: Relação com evolução clínica
- `residentId`: Relação com residente
- `title`: Título/descrição (VARCHAR 255)
- `type`: Tipo do documento (VARCHAR 100, opcional)
- `documentDate`: Data do documento (TIMESTAMPTZ)
- `htmlContent`: Conteúdo HTML original (TEXT)
- `pdfFileUrl`: URL do PDF no MinIO (TEXT)
- `pdfFileKey`: Chave do arquivo no MinIO (TEXT)
- `pdfFileName`: Nome do arquivo PDF (VARCHAR 255)

**Relações:**
- `tenant`: Cascade delete
- `clinicalNote`: Cascade delete (quando evolução é deletada, documento também é)
- `resident`: Cascade delete
- `creator`: Restrict (não pode deletar usuário que criou documentos)

### MinIO/S3
**Caminho:** `tenants/{tenantId}/clinical-documents/{residentId}/{documentId}.pdf`

**Características:**
- PDF gerado no frontend
- Upload via FormData
- Signed URLs para acesso
- Integração com FilesService

## Visualização

### Aba "Documentos de Saúde"
Localização: Prontuário do Residente → Nova aba entre "Vacinação" e "Evoluções Clínicas"

**Componente:** `HealthDocumentsTab.tsx`
**Localização:** `/apps/frontend/src/components/medical-record/`

**Documentos consolidados:**
1. **Prescrições médicas** (PDFs com pdfFileUrl)
2. **Comprovantes de vacinação** (PDFs com certificateUrl)
3. **Documentos Tiptap** (PDFs das evoluções clínicas)

**Ordenação:** Data decrescente (mais recente primeiro)

**Colunas da tabela:**
- Data
- Tipo (badge com ícone)
- Documento (título)
- Ações (botão visualizar)

## Separação de Documentos

### Documentos Administrativos
**Local:** Cadastro do Residente → Aba "Documentos"
**Componente:** `ResidentDocuments.tsx`
**Tipos:** RG, CPF, Comprovantes, Termos, Contratos

### Documentos de Saúde
**Local:** Prontuário do Residente → Aba "Documentos de Saúde"
**Componente:** `HealthDocumentsTab.tsx`
**Tipos:** Prescrições, Vacinações, Documentos Clínicos

## Fluxo Técnico

### Frontend

1. **Usuário habilita switch** de documento no form de evolução
2. **Preenche campos**: título, tipo (opcional), conteúdo (Tiptap)
3. **Ao clicar "Criar Evolução"**:
   - Valida campos do documento (se habilitado)
   - Gera PDF via `generateDocumentPdf()`
   - **Abre modal de preview** com iframe mostrando o PDF
4. **Modal de Preview** (`DocumentPreviewModal`):
   - Exibe PDF em iframe para visualização completa
   - Botão "Voltar para Editar": fecha preview, mantém formulário aberto
   - Botão "Confirmar e Salvar": prossegue com salvamento
5. **Ao confirmar**:
   - Prepara FormData com: `data` (JSON) + `pdfFile` (Blob)
   - Envia via `createClinicalNoteWithDocument()`
   - Fecha ambos os modals e atualiza lista

### Backend

1. **Controller recebe** FormData via `@UseInterceptors(FileInterceptor('pdfFile'))`
2. **Service processa**:
   - Cria evolução clínica
   - Se documento presente:
     - Cria registro em `clinical_note_documents`
     - Faz upload do PDF para MinIO via `FilesService`
     - Atualiza registro com URLs do PDF
3. **Retorna** evolução criada com sucesso

### Busca de Documentos

**Endpoint:** `GET /api/clinical-notes/documents/resident/:residentId`

**Service method:** `getDocumentsByResident()`
- Verifica se residente existe e pertence ao tenant
- Busca documentos ordenados por data DESC
- Retorna array de `ClinicalNoteDocument`

## Dependências

### Backend

- `@nestjs/platform-express` (FileInterceptor)
- `prisma` (ORM)
- `FilesService` (upload MinIO)

### Frontend

- `@tiptap/react@^2.1.13` - Editor WYSIWYG headless
- `@tiptap/starter-kit@^2.1.13` - Extensões básicas (bold, italic, lists, etc)
- `@tiptap/extension-underline@^2.1.13` - Suporte a texto sublinhado
- `@tiptap/extension-link@^2.1.13` - Suporte a hyperlinks
- `@react-pdf/renderer@^3.x` - Geração de PDFs nativos (substitui html2pdf.js)

## Segurança e Permissões

**Permissão necessária:** `VIEW_CLINICAL_NOTES`

**Validações:**
- Multi-tenancy: Todos os queries filtrados por `tenantId`
- UUID validation: `ParseUUIDPipe` em parâmetros
- Authorization: `@RequirePermissions` em todos os endpoints
- Audit: Rastreamento via `createdBy` e `createdAt`

## Limitações e Considerações

### Edição de Documentos
- ❌ **Não é possível editar** documentos após criação
- ✅ Evolução pode ser editada (campos SOAP)
- ℹ️ Documento fica "congelado" após criação

### HTML armazenado
- Salvo no banco para possível futura funcionalidade de edição
- Atualmente não utilizado no frontend
- Pode ser usado para regenerar PDF se necessário

### Performance
- Geração de PDF no frontend evita sobrecarga do servidor
- PDFs grandes (>5MB) podem demorar para upload
- Cache do React Query: 2 minutos de stale time

### Tipos de Documento
Valores aceitos no campo `type`:
- `RELATORIO` - Relatório
- `PEDIDO_EXAME` - Pedido de Exame
- `PARECER` - Parecer
- `ATESTADO` - Atestado
- `EVOLUCAO_DETALHADA` - Evolução Detalhada
- `OUTRO` - Outro

## Migration

**Arquivo:** `20251208110650_add_clinical_note_documents`

**Aplicação:**
```bash
# Manual via psql (ambiente não-interativo)
PGPASSWORD=password psql -h host -p port -U user -d database -f migration.sql
```

**Estrutura criada:**
- Tabela `clinical_note_documents`
- Índice `clinical_note_documents_tenantId_residentId_idx`
- Índice `clinical_note_documents_noteId_idx`
- Foreign keys para `tenants`, `clinical_notes`, `residents`, `users`

## Arquivos Principais

### Backend

- `/apps/backend/prisma/schema.prisma` - Modelo ClinicalNoteDocument
- `/apps/backend/src/clinical-notes/dto/create-clinical-note.dto.ts` - DTO com campo document
- `/apps/backend/src/clinical-notes/clinical-notes.service.ts` - Lógica de criação
- `/apps/backend/src/clinical-notes/clinical-notes.controller.ts` - Endpoints

### Frontend

- `/apps/frontend/src/components/tiptap/TiptapEditor.tsx` - Editor WYSIWYG
- `/apps/frontend/src/components/tiptap/EditorToolbar.tsx` - Toolbar de formatação
- `/apps/frontend/src/components/clinical-notes/ClinicalNotesForm.tsx` - Form com switch e lógica de preview
- `/apps/frontend/src/components/clinical-notes/DocumentPreviewModal.tsx` - Modal de preview com PDFViewer
- `/apps/frontend/src/components/pdf/ClinicalDocumentPDF.tsx` - Componente React-PDF do documento
- `/apps/frontend/src/utils/generateDocumentPdf.ts` - Função que gera PDF blob via react-pdf
- `/apps/frontend/src/utils/htmlToReactPdf.tsx` - Conversor de HTML Tiptap → componentes React-PDF
- `/apps/frontend/src/components/medical-record/HealthDocumentsTab.tsx` - Aba de visualização
- `/apps/frontend/src/api/clinicalNotes.api.ts` - API functions
- `/apps/frontend/src/hooks/useClinicalNotes.ts` - React Query hooks

## Próximos Passos (Futuro)

1. **Edição de documentos**: Permitir editar HTML e regenerar PDF
2. **Numeração de páginas**: Adicionar "Página X de Y" nos PDFs
3. **Cabeçalho repetido**: Cabeçalho institucional em todas as páginas
4. **Suporte a imagens**: Permitir inserir imagens no Tiptap
5. **Templates**: Pré-definir templates para tipos específicos de documentos
6. **Assinatura digital**: Integração com certificado digital
7. **Watermark**: Marca d'água em PDFs
8. **Download em lote**: Baixar múltiplos documentos de uma vez
9. **Busca textual**: Buscar por conteúdo dentro dos documentos
10. **Versionamento**: Histórico de edições de documentos

## Troubleshooting

### PDF não gerado
**Sintoma:** Erro ao clicar em "Criar Evolução"
**Causas possíveis:**
- Dados do residente incompletos (nome, CPF, data nascimento)
- Perfil institucional não configurado
- Navegador bloqueando canvas/html2pdf
**Solução:** Verificar console do navegador para erro específico

### Documento não aparece na aba
**Sintoma:** Evolução criada mas documento não listado
**Causas possíveis:**
- PDF não foi enviado (pdfFile undefined)
- Erro no upload para MinIO
- Cache do React Query desatualizado
**Solução:** Verificar logs do backend, invalidar cache do React Query

### Rota não encontrada (404)
**Sintoma:** GET /clinical-notes/documents/resident/:id retorna 404
**Causas possíveis:**
- Endpoint não registrado corretamente
- Ordem das rotas no controller
- Servidor não reiniciado após mudanças
**Solução:** Verificar logs do NestJS, confirmar rota está mapeada

### PDF em branco (RESOLVIDO com @react-pdf/renderer)
**Sintoma:** PDF preview aparece em branco, mas o blob é gerado
**Causa:** html2pdf.js + html2canvas falhava ao capturar DOM off-screen
**Solução:** Substituído html2pdf.js por @react-pdf/renderer, que gera PDFs nativos ao invés de capturar tela

### Formatação perdida no PDF
**Sintoma:** PDF gerado sem negrito/itálico/listas
**Causas possíveis:**
- Conversor HTML→React-PDF não reconhece todas as tags
- Estilos não aplicados aos componentes React-PDF
**Solução:** Verificar htmlToReactPdf.tsx, adicionar suporte para tags ausentes, conferir estilos no ClinicalDocumentPDF.tsx

---

**Documentação atualizada em:** 08/12/2025
**Versão:** 1.0.0
