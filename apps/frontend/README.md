# Frontend - Rafa ILPI

Frontend do sistema de gestão para ILPIs (Instituições de Longa Permanência para Idosos).

## 🚀 Stack

- **React 18+** - Biblioteca UI
- **TypeScript 5+** - Type safety
- **Vite 5** - Build tool e dev server
- **Tailwind CSS** - Estilização
- **Shadcn/ui** - Componentes UI
- **React Router v6** - Roteamento
- **TanStack Query v5** - Data fetching e cache
- **Zustand** - State management
- **Axios** - HTTP client

## 📁 Estrutura de Pastas

```
src/
├── components/        # Componentes compartilhados
│   └── ui/           # Componentes Shadcn/ui
├── features/         # Features por módulo
│   ├── auth/
│   ├── dashboard/
│   ├── residentes/
│   └── registros-diarios/
├── layouts/          # Layouts da aplicação
│   ├── AuthLayout.tsx
│   └── DashboardLayout.tsx
├── lib/              # Utilitários
│   └── utils.ts
├── providers/        # Context providers
│   └── QueryProvider.tsx
├── routes/           # Configuração de rotas
│   └── index.tsx
├── services/         # Serviços (API, etc)
│   └── api.ts
├── stores/           # Zustand stores
│   └── auth.store.ts
├── types/            # TypeScript types
├── App.tsx
├── main.tsx
└── index.css
```

## 🔧 Configuração

### Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```bash
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=Rafa ILPI
VITE_ENV=development
```

## 🏃 Executar

```bash
# Instalar dependências
npm install

# Dev server (porta 5173)
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

## 🎨 Shadcn/ui

Para adicionar novos componentes:

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
# etc...
```

Componentes serão adicionados em `src/components/ui/`.

## 🔐 Autenticação

O sistema usa JWT com refresh token:

- **Access Token**: 15 minutos (em memória)
- **Refresh Token**: 7 dias (persistido)
- Interceptor Axios renova automaticamente token expirado

Store Zustand em `src/stores/auth.store.ts`:

```ts
const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore()
```

## 🌐 Rotas

Configuradas em `src/routes/index.tsx`:

- `/auth/login` - Login
- `/dashboard` - Dashboard principal
- `/dashboard/residentes` - Gestão de residentes
- `/dashboard/registros-diarios` - Registros diários

## 📡 API Client

Configurado em `src/services/api.ts`:

```ts
import { api } from '@/services/api'

// GET
const response = await api.get('/residentes')

// POST
await api.post('/residentes', data)

// PUT
await api.put(`/residentes/${id}`, data)

// DELETE
await api.delete(`/residentes/${id}`)
```

## 🎯 TanStack Query

Exemplo de uso:

```tsx
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'

// Query
const { data, isLoading } = useQuery({
  queryKey: ['residentes'],
  queryFn: () => api.get('/residentes').then(res => res.data)
})

// Mutation
const mutation = useMutation({
  mutationFn: (data) => api.post('/residentes', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['residentes'] })
  }
})
```

## 🎨 Estilização

Usando Tailwind CSS com Shadcn/ui:

```tsx
<div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
  <Button variant="default">Salvar</Button>
  <Button variant="outline">Cancelar</Button>
</div>
```

## 📦 Build

```bash
# Build de produção
npm run build

# Resultado em dist/
# Servir com Nginx ou outro servidor estático
```

## 🔍 TypeScript

Path aliases configurados:

```ts
import { Button } from '@/components/ui/button'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth.store'
```

## 📝 Próximos Passos

- [ ] Implementar telas de autenticação
- [ ] Criar formulário de cadastro de residentes
- [ ] Implementar listagem e filtros
- [ ] Adicionar validação com Zod
- [ ] Implementar upload de arquivos (MinIO)

---

**Desenvolvido por:** Rafa Labs
**Contato:** contato@rafalabs.com.br
