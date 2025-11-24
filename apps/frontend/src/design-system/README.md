# 🎨 Design System RAFA ILPI

Sistema de design unificado para eliminação de cores hardcoded e criação de infraestrutura escalável.

**Versão**: 1.0.0
**Data**: 24 de novembro de 2025
**Autores**: Dr. E. (Emanuel) + Claude Code

---

## 📚 Índice

- [Visão Geral](#visão-geral)
- [Estrutura](#estrutura)
- [Tokens](#tokens)
- [Componentes](#componentes)
- [Uso](#uso)
- [Migração](#migração)
- [Dark Mode](#dark-mode)

---

## 🎯 Visão Geral

Este Design System resolve o problema crítico de **400+ cores hardcoded** espalhadas pelo código, implementando:

✅ **Tokens semânticos específicos por contexto**
✅ **Dark mode completo**
✅ **Type-safe com TypeScript**
✅ **HSL para compatibilidade shadcn/ui**
✅ **Componentes reutilizáveis**

### Princípio Fundamental

**Mesma cor, tokens diferentes = semântica preservada**

Exemplo:
- `--bed-reserved` (azul) - contexto de leitos
- `--info` (azul) - contexto de UI geral
- `--record-higiene` (azul) - contexto de registros

Mesmo que sejam visualmente iguais, são tokens separados para flexibilidade futura.

---

## 📁 Estrutura

```
src/design-system/
├── tokens/
│   ├── colors.ts          # Tokens de cores semânticas
│   ├── spacing.ts         # Escala de espaçamento
│   ├── typography.ts      # Hierarquia tipográfica
│   ├── shadows.ts         # Sistema de sombras
│   └── radii.ts          # Border radius
├── components/
│   ├── StatCard.tsx       # Card de estatísticas reutilizável
│   ├── StatusBadge.tsx    # Badge com variantes semânticas
│   ├── SeverityAlert.tsx  # Alertas por severidade
│   └── index.ts          # Exports centralizados
├── utils/
│   └── colors.ts         # Helpers de cor
├── themes/
│   ├── light.css         # Variáveis CSS light mode
│   └── dark.css          # Variáveis CSS dark mode
└── README.md             # Este arquivo
```

---

## 🎨 Tokens

### Cores Semânticas

#### Core Colors
- `primary` - Azul Clínico (#2563EB)
- `secondary` - Verde Saúde (#16A34A)
- `accent` - Roxo Multiprofissional (#7C3AED)

#### Feedback Colors
- `success` - Verde (#16A34A)
- `warning` - Amarelo (#CA8A04)
- `danger` - Vermelho (#DC2626)
- `info` - Azul (#2563EB)

#### Bed Status (4 tokens)
- `bed-available` - Leito disponível
- `bed-occupied` - Leito ocupado
- `bed-maintenance` - Em manutenção
- `bed-reserved` - Reservado

#### Record Types (10 tokens)
- `record-higiene`
- `record-alimentacao`
- `record-hidratacao`
- `record-monitoramento`
- `record-eliminacao`
- `record-comportamento`
- `record-intercorrencia`
- `record-atividades`
- `record-visita`
- `record-outros`

#### Severity Levels (3 tokens)
- `severity-critical` - Crítico
- `severity-warning` - Atenção
- `severity-info` - Informação

#### Medications (3 tokens)
- `medication-controlled` - Controlado
- `medication-sos` - SOS
- `medication-high-risk` - Alto risco

### Tipografia

Fonte: **Inter** (hospedada localmente)

Escala:
- `text-xs` (12px) - Legendas
- `text-sm` (14px) - Secundário
- `text-base` (16px) - Corpo
- `text-lg` (18px) - Destaque
- `text-xl` (20px) - Subtítulos
- `text-2xl` (24px) - Títulos de seção
- `text-3xl` (30px) - Títulos de página

### Spacing

- `xs` (4px)
- `sm` (8px)
- `md` (16px)
- `lg` (24px)
- `xl` (32px)

### Border Radius

Padrão RAFA ILPI: **Soft Rounded** (`rounded-xl` = 16px)

---

## 🧩 Componentes

### StatCard

Card reutilizável para estatísticas (substitui 4+ implementações duplicadas).

```tsx
import { StatCard } from '@/design-system/components'
import { Users } from 'lucide-react'

<StatCard
  title="Residentes"
  value={123}
  icon={Users}
  variant="primary"
  description="Total cadastrados"
/>
```

**Variantes**: `primary | secondary | success | warning | danger | info | accent`

### StatusBadge

Badge com variantes semânticas automáticas.

```tsx
import { StatusBadge } from '@/design-system/components'

// Bed Status
<StatusBadge variant="bed-available">Disponível</StatusBadge>
<StatusBadge variant="bed-occupied">Ocupado</StatusBadge>

// Record Types
<StatusBadge variant="record-higiene">Higiene</StatusBadge>
<StatusBadge variant="record-alimentacao">Alimentação</StatusBadge>

// Severity
<StatusBadge variant="severity-critical">Crítico</StatusBadge>

// Medications
<StatusBadge variant="medication-controlled">Controlado</StatusBadge>
```

**40+ variantes** cobrindo todos os contextos do sistema.

### SeverityAlert

Alertas com níveis de severidade.

```tsx
import { SeverityAlert } from '@/design-system/components'

<SeverityAlert
  severity="critical"
  message="Prescrição vencida há 7 dias"
  onDismiss={() => console.log('dismissed')}
/>

<SeverityAlert
  severity="warning"
  title="Atenção necessária"
  message="Medicamento controlado sem receita anexada"
/>

<SeverityAlert
  severity="info"
  message="Sistema atualizado com sucesso"
/>
```

### Button (estendido)

Variantes adicionais: `success | warning | danger | info`

```tsx
import { Button } from '@/components/ui/button'

<Button variant="success">Confirmar</Button>
<Button variant="warning">Atenção</Button>
<Button variant="danger">Cancelar</Button>
<Button variant="info">Informação</Button>
```

### Badge (estendido)

Variantes adicionais: `success | warning | danger | info`

```tsx
import { Badge } from '@/components/ui/badge'

<Badge variant="success">Sucesso</Badge>
<Badge variant="warning">Atenção</Badge>
<Badge variant="danger">Erro</Badge>
<Badge variant="info">Info</Badge>
```

---

## 💻 Uso

### Importando Tokens

```tsx
import {
  BED_STATUS_COLORS,
  RECORD_TYPE_CONFIG,
  SEVERITY_COLORS,
  getBedStatusColor,
  getRecordTypeConfig,
  getSeverityColors,
} from '@/design-system/tokens/colors'
```

### Importando Componentes

```tsx
import { StatCard, StatusBadge, SeverityAlert } from '@/design-system/components'
```

### Importando Helpers

```tsx
import {
  getBedStatusClasses,
  getRecordTypeClasses,
  getSeverityClasses,
} from '@/design-system/utils/colors'
```

### Usando Tokens CSS Diretamente

```tsx
// Em componentes
<div className="bg-bed-available text-bed-available-foreground">
  Leito disponível
</div>

<div className="bg-success/10 text-success border border-success/30">
  Operação bem-sucedida
</div>
```

---

## 🔄 Migração

### Antes (Hardcoded)

```tsx
// ❌ Antes - cor hardcoded
<Badge className="bg-green-100 text-green-800 border-green-300">
  Disponível
</Badge>

// ❌ Objeto local duplicado
const BED_STATUS_COLORS = {
  DISPONIVEL: 'bg-green-100 text-green-800',
  // ...
}
```

### Depois (Design System)

```tsx
// ✅ Depois - token semântico
<StatusBadge variant="bed-available">
  Disponível
</StatusBadge>

// ✅ Ou usando helper
import { getBedStatusClasses } from '@/design-system/utils/colors'
<Badge className={getBedStatusClasses('DISPONIVEL')}>
  Disponível
</Badge>
```

### Checklist de Migração

1. ✅ Identificar cores hardcoded
2. ✅ Mapear para token semântico correspondente
3. ✅ Substituir por componente ou helper
4. ✅ Remover constantes locais duplicadas
5. ✅ Validar visualmente
6. ✅ Testar light e dark mode

---

## 🌓 Dark Mode

Dark mode funcional implementado.

### Ativando Dark Mode

```tsx
// No root do app ou em toggle de tema
<html className="dark">
  {/* app */}
</html>
```

### Testando

1. Abrir DevTools
2. Console: `document.documentElement.classList.add('dark')`
3. Verificar cores ajustadas automaticamente

### Cores Auto-Ajustadas

Todas as variáveis CSS em `themes/dark.css` são ajustadas para contraste em fundo escuro, mantendo acessibilidade WCAG AA.

---

## 📖 Recursos Adicionais

### Documentação de Referência

- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [class-variance-authority](https://cva.style/)
- [Radix UI](https://www.radix-ui.com/)

### Arquivos de Referência

- `tasks/todo-design-system.md` - TODO completo da migração
- `docs/bugs-backend.md` - Histórico de bugs resolvidos

---

## 🎯 Próximos Passos

### Fase 2: Migração de Módulos

1. **Módulo Leitos** (PR #2)
2. **Módulo Registros Diários** (PR #3)
3. **Módulo Prescrições** (PR #4)
4. **Módulo Residentes** (PR #5)
5. **UI Geral** (PR #6)

### Melhorias Futuras

- Storybook para documentação visual
- Testes visuais automatizados (Chromatic)
- White-label (múltiplos temas)
- Animações consistentes
- Modo de alto contraste

---

**Dúvidas?** Consulte `/tasks/todo-design-system.md` ou os comentários inline nos arquivos de tokens.
