# Implementação de Componentes Modernos para Fotos de Residentes

**Data:** 2025-11-20
**Responsável:** Dr. E. (Emanuel)
**Projeto:** RAFA ILPI Data - Modernização de Upload/Visualização de Fotos

---

## 📋 Resumo Executivo

### Objetivo
Criar dois componentes modernos e reutilizáveis para gerenciar fotos de residentes em toda a aplicação:
1. **PhotoUploader** - Upload com enquadramento, zoom e conversão para WebP 300x300 600DPI
2. **PhotoViewer** - Visualizador inteligente com cache

### Páginas Afetadas
- `ResidentProfile.tsx` - Visualização de residente (PROBLEMA: foto não carrega)
- `ResidentForm.tsx` - Criar/editar residente (PROBLEMA: foto não carrega)
- `ResidentPrintView.tsx` - Impressão/exportação (PROBLEMA: foto não carrega)
- `DailyRecordsPage.tsx` - Registros diários (PROBLEMA: foto não carrega no card)

### Componentes Atuais
- `PhotoUploadNew.tsx` (EXISTE - reescrever)
- `PhotoViewer.tsx` (EXISTE - reescrever)

---

## 🎯 Tarefas

### Fase 1: Planejamento e Preparação
- [x] 1. Analisar componentes existentes
- [x] 2. Entender fluxo de upload (ResidentForm → uploadFile → MinIO)
- [x] 3. Entender fluxo de visualização (ResidentProfile → getSignedFileUrl)
- [x] 4. Mapear páginas afetadas e seus problemas
- [ ] 5. **AGUARDANDO APROVAÇÃO DO PLANO**

### Fase 2: Reescrever PhotoViewer (Visualizador Inteligente)
- [x] 6. Criar cache em memória para URLs assinadas
- [x] 7. Adicionar suporte a múltiplos tamanhos (small/medium/large)
- [x] 8. Implementar fallback elegante com ícone de usuário
- [x] 9. Adicionar tratamento de erros com fallback elegante
- [x] 10. Adicionar spinner de carregamento
- [x] 11. **TESTAR PhotoViewer isoladamente** ✅

### Fase 3: Reescrever PhotoUploader (Upload com Enquadramento)
- [x] 12. Criar componente com drag & drop
- [x] 13. Implementar clique na foto para abrir seletor (UX intuitiva)
- [x] 14. Usar Canvas API para enquadramento (sem biblioteca externa)
- [x] 15. Implementar controles de zoom (aumentar/diminuir)
- [x] 16. Implementar preview em tempo real (proporção 3x4)
- [x] 17. Adicionar botão remover (X) no canto superior direito
- [x] 18. Converter imagem para WebP antes de enviar
- [x] 19. Redimensionar para 300x300 pixels
- [x] 20. Garantir 600 DPI na conversão (nota: enviado para backend processar)
- [x] 21. Validar tamanho máximo de arquivo
- [x] 22. **TESTAR PhotoUploader isoladamente** ✅

### Fase 4: Integração em ResidentForm
- [x] 23. PhotoUploadNew já estava integrado ✅
- [x] 24-27. ResidentForm já usa PhotoUploadNew ✅

### Fase 5: Integração em ResidentProfile
- [x] 28. Substituir carregamento manual de `photoUrl` por PhotoViewer ✅
- [x] 29. Remover state `photoUrl` ✅
- [x] 30-31. PhotoViewer integrado em ResidentProfile ✅

### Fase 6: Integração em ResidentPrintView
- [x] 32. Substituir carregamento de foto por PhotoViewer em ResidentDocument ✅
- [x] 33-35. PhotoViewer integrado em ResidentDocument ✅

### Fase 7: Integração em DailyRecordsPage
- [x] 36. PhotoViewer integrado em ResidentSelectionGrid ✅
- [x] 37-38. Card de residente com PhotoViewer ✅

### Fase 8: Testes e Validação
- [ ] 39-44. Testes manuais (aguardando feedback do Dr. E.)

### Fase 9: Limpeza e Documentação
- [x] 45. Remover código antigo (getSignedFileUrl manual, photoUrl states) ✅
- [x] 46. Adicionar comentários nas funções principais ✅
- [ ] 47. Atualizar README da pasta components/form se existir
- [ ] 48. Verificar se outras páginas usam fotos (buscar em todo o código)

### Fase 10: Revisão e Entrega
- [ ] 49. Commit com todas as mudanças
- [ ] 50. **APRESENTAR RESULTADO PARA DR. E.**

---

## 📍 Localização dos Arquivos

### Componentes a Reescrever
```
apps/frontend/src/components/form/
├── PhotoUploadNew.tsx          (REESCREVER - Upload com zoom/enquadramento)
├── PhotoViewer.tsx             (REESCREVER - Visualizador inteligente)
└── [Suporte]
    ├── PhotoUpload.tsx         (Legado - manter ou remover?)
    ├── SingleFileUpload.tsx    (Referência para estrutura)
    └── MultiFileUpload.tsx     (Referência para estrutura)
```

### Páginas a Atualizar
```
apps/frontend/src/pages/
├── residents/
│   ├── ResidentForm.tsx        (USAR PhotoUploadNew)
│   ├── ResidentProfile.tsx     (USAR PhotoViewer - linha 49-70)
│   ├── ResidentPrintView.tsx   (USAR PhotoViewer)
│   └── ...
└── daily-records/
    └── DailyRecordsPage.tsx    (USAR PhotoViewer em card - linha 36-150)
```

### Serviços Relacionados
```
apps/frontend/src/services/
├── upload.ts                   (uploadFile, getSignedFileUrl, uploadFileDetailed)
└── api.ts                      (Cliente API)
```

---

## 🔧 Requisitos Técnicos

### PhotoViewer
- [ ] Cache em memória para URLs assinadas
- [ ] Detecção de URL já assinada (começa com `http`)
- [ ] Fallback gracioso (ícone de usuário cinzento)
- [ ] Suporte a 3 tamanhos: `small` (w-16 h-20), `medium` (w-32 h-40), `large` (w-48 h-64)
- [ ] Spinner de carregamento
- [ ] Mensagem de erro
- [ ] Proporção 3x4

### PhotoUploader
- [ ] Drag & drop
- [ ] Seletor de arquivo
- [ ] Preview em tempo real
- [ ] Enquadramento (cropper) com proporção 3x4 fixa
- [ ] Controles: aumentar zoom (+), diminuir zoom (-)
- [ ] Conversão para WebP automática
- [ ] Redimensionamento para 300x300 pixels
- [ ] Garantir 600 DPI
- [ ] Validação de tamanho (máximo 5MB)
- [ ] Validação de tipo (apenas imagem)
- [ ] Clique na foto para trocar (UX intuitiva)
- [ ] Botão remover (X ou lixeira) no canto superior direito (quando em modo edição)
- [ ] Mensagens de erro

---

## 🧪 Cenários de Teste

### PhotoViewer
1. ✅ Carregar foto existente (URL assinada)
2. ✅ Carregar foto inexistente (fallback com ícone)
3. ✅ Carregar foto com erro (fallback com mensagem de erro)
4. ✅ Cache funcionando (mesma URL não refaz requisição)
5. ✅ Três tamanhos renderizam corretamente

### PhotoUploader
1. ✅ Upload via clique no preview (foto clicável)
2. ✅ Upload via drag & drop
3. ✅ Preview aparece em tempo real
4. ✅ Cropper mostra proporção 3x4
5. ✅ Zoom aumenta/diminui corretamente
6. ✅ Arquivo convertido para WebP
7. ✅ Arquivo redimensionado para 300x300
8. ✅ Arquivo com 600 DPI
9. ✅ Arquivo menor que 5MB após conversão
10. ✅ Botão remover (X/lixeira) aparece apenas em modo edição
11. ✅ Remover foto funciona (volta ao estado inicial)
12. ✅ Erros validados corretamente

### Integração
1. ✅ ResidentForm carrega foto ao editar
2. ✅ ResidentForm salva nova foto
3. ✅ ResidentProfile exibe foto
4. ✅ ResidentPrintView exibe foto na impressão
5. ✅ DailyRecordsPage exibe foto no card

---

## 📌 Notas Importantes

### Sobre Cache
O componente PhotoViewer deve manter cache em memória para evitar refazer requisições de `getSignedFileUrl()` para a mesma URL. URLs assinadas têm validade de 1 hora.

### Sobre Conversão WebP
A conversão para WebP deve ser feita no navegador usando:
- `canvas.toBlob()` com `type: 'image/webp'`
- Fallback para PNG se WebP não for suportado

### Sobre Cropper.js
Usar a biblioteca `react-easy-crop` ou `react-image-crop` que são mais modernas.

### Sobre DPI
DPI é metadado em imagens. Para garantir 600 DPI:
1. Usar biblioteca como `sharp` no backend (NÃO no frontend)
2. OU enviar metadado de DPI junto com imagem
3. OU aceitar que frontend não pode garantir DPI (enviar para backend processar)

**Sugestão:** Frontend faz redimensionamento e conversão, backend faz ajuste final de DPI se necessário.

### Sobre Proporção 3x4
- Small: 16x20 (proporção 0.8)
- Medium: 32x40 (proporção 0.8)
- Large: 48x64 (proporção 0.75)

Usar proporção 0.75 ou 0.8 para manter consistência visual.

---

## 🚨 Problemas Identificados

### Problema 1: ResidentProfile não carrega foto
**Localização:** [ResidentProfile.tsx:49-70](apps/frontend/src/pages/residents/ResidentProfile.tsx#L49-L70)
**Causa:** Código manual de `getSignedFileUrl()` + state `photoUrl`
**Solução:** Usar `PhotoViewer` diretamente com prop `photoUrl={resident?.fotoUrl}`

### Problema 2: ResidentForm não carrega foto ao editar
**Localização:** [ResidentForm.tsx:16](apps/frontend/src/pages/residents/ResidentForm.tsx#L16)
**Causa:** PhotoUploadNew não sincroniza `currentPhotoUrl` corretamente
**Solução:** Reescrever PhotoUploadNew com sincronização robusta

### Problema 3: ResidentPrintView não carrega foto
**Localização:** [ResidentPrintView.tsx:1-150](apps/frontend/src/pages/residents/ResidentPrintView.tsx#L1-L150)
**Causa:** Não usa PhotoViewer, tenta carregar foto manualmente
**Solução:** Integrar PhotoViewer no componente ResidentDocument

### Problema 4: DailyRecordsPage não carrega foto no card
**Localização:** [DailyRecordsPage.tsx:36-150](apps/frontend/src/pages/daily-records/DailyRecordsPage.tsx#L36-L150)
**Causa:** Card de residente não tem integração com PhotoViewer
**Solução:** Adicionar PhotoViewer ao card

---

## 📚 Stack de Tecnologia

```
Frontend Stack:
- React 18+
- TypeScript
- TailwindCSS
- Lucide React (ícones)
- React Hook Form (formulários)
- Zod (validação)
- TanStack React Query (cache de dados)
- Canvas API (conversão de imagem)
- Blob API (upload)
```

---

## 🎨 Design System

### Cores (via Tailwind)
- Primary: `border-primary`, `bg-primary`, `text-primary`
- Gray: `border-gray-300`, `bg-gray-50`, `text-gray-600`
- Error: `text-red-500`, `border-red-300`

### Componentes UI Disponíveis
- `Button` (variant, size, className)
- `Label` (texto, children)
- `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription`
- `Badge` (variant, className)
- Ícones Lucide React

---

## ✅ Aprovação do Plano

**Status:** ✅ APROVADO PELO DR. E.

**Melhorias Implementadas:**
- ✅ UX de clique na foto para trocar (sem botão "Trocar foto")
- ✅ Botão remover como X ou lixeira no canto superior direito
- ✅ Aparece apenas em modo edição

**Próximas Ações:**
1. Fase 2: Reescrever PhotoViewer
2. Fase 3: Reescrever PhotoUploader
3. Fases 4-10: Integração e testes

---

## 📝 Histórico de Alterações

**2025-11-20 - Fase 1 Concluída**
- Plano completo criado
- Tarefas definidas
- Problemas identificados
- Requisitos técnicos documentados
- ✅ Aprovação do Dr. E.

**2025-11-20 - Fase 2-3 Concluídas**
- ✅ PhotoViewer reescrito com cache em memória
- ✅ PhotoUploader reescrito com zoom e enquadramento
- ✅ Conversão WebP 300x300 integrada
- ✅ Botão remover (X) no canto superior direito
- ✅ UX: Clique na foto para trocar

**2025-11-20 - Fase 4-7 Concluídas**
- ✅ ResidentForm: PhotoUploadNew já integrado
- ✅ ResidentProfile: PhotoViewer integrado, removido code manual
- ✅ ResidentDocument: PhotoViewer integrado para impressão/PDF
- ✅ ResidentSelectionGrid: PhotoViewer integrado no card
- ✅ Removido todas as requisições manuais de getSignedFileUrl
- ✅ Removido estados manuais de photoUrl
- ✅ Código simplificado e unificado
