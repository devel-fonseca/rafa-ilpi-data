# Frontend Performance Follow-up Plan

## Baseline atual

Build atual do frontend:
- `vendor-charts`: ~1.13 MB
- `vendor`: ~1.16 MB
- `vendor-pdf`: ~1.89 MB
- `vendor-tf`: ~1.91 MB
- `index`: ~2.09 MB

Warnings relevantes do build:
1. `src/services/upload.ts` é importado de forma estática e dinâmica.
2. `src/services/faceDetection.ts` é importado de forma estática e dinâmica.
3. Ainda existem chunks muito grandes, mesmo após a limpeza de devtools e chunking obsoleto.

## Objetivo

Reduzir o custo inicial de carregamento e melhorar a eficiência do bundle sem reabrir riscos altos de regressão funcional.

## Princípios

1. Priorizar code splitting real antes de mexer em bibliotecas grandes.
2. Evitar reescrever fluxos críticos em um único PR.
3. Validar por medição objetiva do build a cada etapa.
4. Manter rollback simples.

## Onda 1: destravar code splitting que hoje não funciona

### PR 1: isolar `upload.ts`

Problema:
- `upload.ts` aparece como import estático e dinâmico ao mesmo tempo.
- Isso impede o Vite de mover o módulo para outro chunk.

Arquivos de entrada já identificados:
- `src/components/residents/ResidentDocuments.tsx`
- `src/components/form/PhotoViewer.tsx`
- `src/components/resident-panel/MedicationsView.tsx`
- `src/components/residents/AssignPhotoDialog.tsx`
- `src/layouts/DashboardLayout.tsx`
- `src/pages/prescriptions/PrescriptionDetails.tsx`
- `src/pages/prescriptions/PrescriptionEdit.tsx`
- `src/pages/residents/ResidentForm.tsx`

Estratégia:
- separar `upload.ts` em módulos menores por responsabilidade, por exemplo:
  - `upload-read.ts`
  - `upload-write.ts`
  - `upload-signed-url.ts`
- manter import estático só para o que é necessário no bootstrap.
- usar import dinâmico só para fluxos pesados e raros.

Meta:
- eliminar o warning de import misto de `upload.ts`.
- reduzir `index` e/ou `vendor` sem mudar comportamento.

### PR 2: isolar `faceDetection.ts`

Problema:
- `faceDetection.ts` também mistura import estático e dinâmico.
- Isso prende o stack do TensorFlow de forma menos eficiente.

Arquivos de entrada já identificados:
- `src/pages/profile/MyProfile.tsx`
- `src/components/form/PhotoUploadNew.tsx`

Estratégia:
- concentrar o carregamento do stack de face detection em caminho lazy.
- garantir que o módulo só seja importado quando o usuário realmente abrir o fluxo de foto com detecção.

Meta:
- eliminar o warning de import misto de `faceDetection.ts`.
- reduzir impacto do `vendor-tf` na navegação inicial.

## Onda 2: atacar bibliotecas pesadas por domínio

### PR 3: reduzir custo do bloco PDF/export

Problema:
- `vendor-pdf` ainda é um dos maiores chunks.

Bibliotecas envolvidas:
- `@react-pdf/renderer`
- `jspdf`
- `jspdf-autotable`
- `html2canvas`
- `html2pdf.js`

Estratégia:
- mapear quais telas realmente usam cada stack.
- lazy-load por fluxo de exportação/relatório.
- evitar importar bibliotecas de export no caminho principal das telas.
- onde possível, padronizar em menos stacks de geração de PDF.

Meta:
- reduzir `vendor-pdf` e remover bibliotecas de export do caminho de navegação comum.

### PR 4: revisar custo do bloco charts

Problema:
- `vendor-charts` ficou grande após a migração para ECharts.

Estratégia:
- verificar se o wrapper atual está puxando mais do que o necessário.
- avaliar import mais granular do ECharts, se viável sem deteriorar manutenção.
- lazy-load das páginas mais pesadas de gráficos, se ainda não estiverem de fato isoladas.

Meta:
- reduzir `vendor-charts` ou, no mínimo, empurrá-lo melhor para rotas específicas.

## Onda 3: reduzir o chunk `vendor` genérico

### PR 5: inventário do `vendor` residual

Problema:
- o chunk `vendor` genérico ainda está muito grande.

Estratégia:
- rodar build com inspeção do output e mapear os maiores contribuidores que caíram em `vendor`.
- promover novos agrupamentos só quando fizer sentido por domínio real.
- evitar voltar para `manualChunks` excessivamente granular sem prova de ganho.

Meta:
- quebrar `vendor` em grupos que reflitam uso real do app.

## Onda 4: medição e guarda de regressão

### PR 6: orçamento simples de bundle

Estratégia:
- registrar baseline de build no repositório.
- adicionar verificação simples em CI ou script local para:
  - warnings de imports mistos
  - crescimento anormal dos maiores chunks

Meta:
- evitar regressão silenciosa depois da limpeza.

## Ordem recomendada

1. PR 1: isolar `upload.ts`
2. PR 2: isolar `faceDetection.ts`
3. PR 3: reduzir bloco PDF/export
4. PR 4: revisar bloco charts
5. PR 5: quebrar `vendor` residual
6. PR 6: orçamento simples de bundle

## Critério de sucesso

1. build sem warnings de imports mistos
2. `index` abaixo do patamar atual
3. redução material de `vendor`, `vendor-pdf` e `vendor-tf`
4. nenhuma regressão funcional em:
- upload de arquivos
- foto/perfil com detecção facial
- gráficos
- relatórios/exportações
