# 🚀 Guia do Workspace VSCode/Codium

Este guia explica como usar o workspace configurado para o projeto Rafa ILPI.

## 📁 Abertura do Workspace

### Opção 1: Abrir via arquivo .code-workspace

```bash
# No terminal
cd /home/emanuel/Documentos/GitHub/rafa-ilpi-data
code rafa-ilpi-data.code-workspace

# Ou com Codium
codium rafa-ilpi-data.code-workspace
```

### Opção 2: Abrir via VSCode/Codium

1. Abra o VSCode/Codium
2. File → Open Workspace from File
3. Selecione `rafa-ilpi-data.code-workspace`

## 🎯 Estrutura do Workspace

O workspace está organizado em 3 pastas:

```
🏠 Root          → Raiz do projeto (monorepo)
🔧 Backend       → apps/backend (NestJS)
⚛️ Frontend      → apps/frontend (React + Vite)
```

Você verá cada pasta como uma "pasta raiz" separada no explorador do VSCode.

## 🛠️ Recursos Configurados

### 1. Formatação Automática

- **Format on Save:** Habilitado
- **Formatter:** Prettier
- **ESLint Fix:** Automático ao salvar

### 2. TypeScript

- **SDK:** Local do projeto (node_modules)
- **Import Style:** Relative paths
- **Prompt:** Usar TS do workspace

### 3. Prisma

- **Formatter:** Prisma Extension
- **Auto-format:** Habilitado ao salvar arquivos `.prisma`

### 4. Exclusões

Arquivos/pastas ocultos:
- `node_modules/`
- `dist/`
- `logs/`
- `*.log`
- `.git/`

## 🎮 Tasks Disponíveis

Pressione `Ctrl+Shift+P` (ou `Cmd+Shift+P` no Mac) e digite "Run Task":

### Tasks Principais

| Task | Descrição |
|------|-----------|
| 🚀 **Start Full Stack** | Inicia Docker + Backend + Frontend |
| 🐳 Start Docker Compose | Apenas Docker (PostgreSQL + Redis) |
| 🔧 Start Backend (Dev) | Apenas Backend (NestJS) |
| ⚛️ Start Frontend (Dev) | Apenas Frontend (React) |
| 🛑 Stop Docker Compose | Para todos os containers Docker |

### Tasks Prisma

| Task | Descrição |
|------|-----------|
| 🗄️ **Prisma Studio** | Abre interface visual do banco |
| 🔄 Prisma Migrate | Executa migrations |
| 🌱 Prisma Seed | Popula banco com dados iniciais |

## 🐛 Debug Configurado

Pressione `F5` ou vá em "Run and Debug" (barra lateral):

### Configurações de Debug

1. **🔧 Debug Backend**
   - Inicia backend em modo debug (porta 9229)
   - Breakpoints funcionando
   - Hot reload habilitado

2. **⚛️ Debug Frontend**
   - Abre Chrome com debugger
   - Breakpoints no código React
   - DevTools integrados

3. **🚀 Debug Full Stack** ⭐
   - Debugger para backend E frontend simultaneamente
   - Perfeito para debug de chamadas API

### Como usar Debug

1. Coloque breakpoints no código (clique na margem esquerda do editor)
2. Pressione `F5`
3. Escolha a configuração de debug
4. Seu código vai pausar nos breakpoints

## 🔌 Extensões Recomendadas

Ao abrir o workspace, você verá uma notificação para instalar extensões recomendadas.

### Essenciais

- **ESLint** - Linting de código
- **Prettier** - Formatação automática
- **Prisma** - Suporte a schema Prisma

### Backend

- **SQLTools** - Conexão com PostgreSQL
- **SQLTools PostgreSQL Driver** - Driver do PostgreSQL

### Frontend

- **Tailwind CSS IntelliSense** - Autocomplete do Tailwind
- **Auto Rename Tag** - Renomeia tags HTML/JSX automaticamente
- **ES7+ React Snippets** - Snippets React

### DevOps

- **Docker** - Gerenciamento de containers
- **GitLens** - Git avançado

### Utilidades

- **Path Intellisense** - Autocomplete de paths
- **Code Spell Checker** - Corretor ortográfico
- **TODO Highlight** - Destaca TODOs/FIXMEs
- **Better Comments** - Comentários coloridos

## ⚙️ Configurações Aplicadas

### Editor

```json
{
  "editor.formatOnSave": true,
  "editor.tabSize": 2,
  "editor.insertSpaces": true
}
```

### Files

```json
{
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true,
  "files.eol": "\n"
}
```

### TypeScript

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

## 🚀 Workflow Recomendado

### Iniciando o Projeto

1. Abra o workspace: `code rafa-ilpi-data.code-workspace`
2. Instale as extensões recomendadas (notificação aparecerá)
3. Execute a task "🚀 Start Full Stack" (`Ctrl+Shift+P` → Run Task)
4. Aguarde todos os serviços iniciarem

### Desenvolvimento Diário

1. Abra o workspace
2. Execute "🚀 Start Full Stack" (ou apenas Backend/Frontend se preferir)
3. Edite os arquivos
4. Salve → formatação automática + ESLint fix
5. Teste as mudanças
6. Commit quando tudo estiver funcionando

### Debugging

1. Coloque breakpoints onde precisar
2. Pressione `F5`
3. Escolha "🚀 Debug Full Stack"
4. Interaja com a aplicação
5. O debugger pausará nos breakpoints

### Banco de Dados

1. Execute a task "🗄️ Prisma Studio"
2. Interface visual abrirá em `http://localhost:5555`
3. Visualize e edite dados
4. Ou use SQLTools para queries SQL diretas

## 📊 Terminal Integrado

O terminal integrado já vem configurado:

- **Default:** Bash
- **CWD:** Pasta do workspace atual

### Dica: Múltiplos Terminais

1. Terminal → Split Terminal (`Ctrl+Shift+5`)
2. Um terminal para backend, outro para frontend
3. Organize com drag & drop

## 🎨 Customizações

Você pode adicionar suas próprias configurações em:

- **Workspace Settings:** `.code-workspace` (compartilhado no git)
- **Local Settings:** `.vscode/settings.json` (compartilhado no git)
- **User Settings:** Suas configurações pessoais (não commitadas)

## 📝 Atalhos Úteis

| Atalho | Ação |
|--------|------|
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+P` | Quick Open (abrir arquivo) |
| `Ctrl+Shift+F` | Busca global |
| `Ctrl+Shift+B` | Run Build Task |
| `F5` | Start Debug |
| `Shift+F5` | Stop Debug |
| `Ctrl+Shift+D` | Debug Sidebar |
| `Ctrl+`` | Toggle Terminal |
| `Ctrl+Shift+5` | Split Terminal |

## 🔧 Troubleshooting

### Problema: TypeScript não reconhece tipos

**Solução:**
1. `Ctrl+Shift+P`
2. "TypeScript: Select TypeScript Version"
3. Selecione "Use Workspace Version"

### Problema: Prettier não formata ao salvar

**Solução:**
1. Verifique se a extensão Prettier está instalada
2. `Ctrl+Shift+P` → "Format Document"
3. Escolha Prettier como formatter padrão

### Problema: ESLint não funciona

**Solução:**
1. Verifique se há `node_modules` instalado
2. Execute `npm install` na pasta do backend/frontend
3. Reinicie o VSCode

### Problema: Debug não inicia

**Solução:**
1. Verifique se os serviços estão rodando
2. Confira se a porta 9229 está livre
3. Execute a task manualmente antes de debugar

## 📚 Recursos Adicionais

- [VSCode Tips](https://code.visualstudio.com/docs/getstarted/tips-and-tricks)
- [VSCode Debugging](https://code.visualstudio.com/docs/editor/debugging)
- [VSCode Tasks](https://code.visualstudio.com/docs/editor/tasks)

---

**Pronto para começar!** 🎯

Qualquer dúvida, consulte a [documentação principal](../README.md).
