# Rafa Labs Brand Kit

## Sobre a Rafa Labs

**Rafa Labs** é uma empresa de compliance tech fundada por um advogado com vasta experiência em compliance regulatório. Nossa solução inovadora, **Rafa ILPI**, atende instituições de longa permanência para idosos (ILPIs), integrando conhecimento jurídico e tecnologia de ponta.

**Significado de RAFA:**
- **R** - Registro
- **A** - Análise
- **F** - Fiscalização
- **A** - Auditoria

---

## Paleta de Cores

### Cores Primárias

| Cor | Hex | RGB | Uso |
|-----|-----|-----|-----|
| Azul Marinho | `#0f172a` | rgb(15, 23, 42) | Fundos principais, textos, headers |
| Verde | `#059669` | rgb(5, 150, 105) | Acentos, CTAs, destaques positivos |
| Ciano | `#06b6d4` | rgb(6, 182, 212) | Acentos secundários, links, ícones |

### Cores Secundárias e Neutros

| Cor | Hex | RGB | Uso |
|-----|-----|-----|-----|
| Branco | `#ffffff` | rgb(255, 255, 255) | Fundos, textos em fundo escuro |
| Cinza Claro | `#f8fafc` | rgb(248, 250, 252) | Fundos alternativos, cards |
| Cinza Médio | `#64748b` | rgb(100, 116, 139) | Textos secundários |
| Cinza Escuro | `#334155` | rgb(51, 65, 85) | Textos, bordas |

### Combinações Recomendadas

- **Fundo escuro:** Azul Marinho + texto Branco + acentos Verde/Ciano
- **Fundo claro:** Branco + texto Azul Marinho + acentos Verde/Ciano
- **CTAs:** Verde como cor principal de botões
- **Links:** Ciano para links e elementos interativos

---

## Tipografia

### Fonte Principal: Playfair Display

**Uso:** Títulos, headlines, nomes em cartões de visita

**Características:**
- Fonte serifada
- Elegância e autoridade
- Transmite expertise e profissionalismo

**Pesos recomendados:**
- Regular (400) - Subtítulos
- SemiBold (600) - Títulos secundários
- Bold (700) - Títulos principais

**Tamanhos sugeridos:**
- H1: 48px / 3rem
- H2: 36px / 2.25rem
- H3: 24px / 1.5rem
- H4: 20px / 1.25rem

### Fonte Secundária: DM Sans

**Uso:** Corpo de texto, parágrafos, botões, textos corridos

**Características:**
- Fonte sans-serif
- Legibilidade excelente
- Visual moderno e clean

**Pesos recomendados:**
- Regular (400) - Texto corrido
- Medium (500) - Botões, labels
- Bold (700) - Ênfases

**Tamanhos sugeridos:**
- Corpo: 16px / 1rem
- Pequeno: 14px / 0.875rem
- Labels: 12px / 0.75rem

### Importação (Web)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet">
```

```css
:root {
  --font-heading: 'Playfair Display', serif;
  --font-body: 'DM Sans', sans-serif;
}
```

---

## Logo

### Descrição

O logo da Rafa Labs é circular e minimalista, representando proteção, conformidade e tecnologia.

### Variações de Uso

| Variação | Fundo | Uso |
|----------|-------|-----|
| Logo colorido | Branco/Claro | Uso principal |
| Logo branco | Azul Marinho/Escuro | Fundos escuros |
| Logo monocromático | Qualquer | Impressões P&B |

### Área de Proteção

Manter espaçamento mínimo ao redor do logo equivalente à altura da letra "R" do logo.

### Tamanhos Mínimos

- **Digital:** 32px de altura
- **Impressão:** 10mm de altura

### Erros Comuns (Evitar)

- ❌ Distorcer proporções
- ❌ Aplicar efeitos (sombra, brilho, 3D)
- ❌ Alterar cores da paleta
- ❌ Rotacionar o logo
- ❌ Usar em fundos que comprometam legibilidade
- ❌ Adicionar elementos ao logo

---

## Aplicações

### Apresentações

- Usar template com header azul marinho
- Títulos em Playfair Display
- Corpo em DM Sans
- Acentos em verde/ciano para destaques
- Logo no rodapé ou canto superior

### Website e Interfaces

- Header com fundo azul marinho
- CTAs em verde (#059669)
- Links em ciano (#06b6d4)
- Fundo principal branco ou cinza claro
- Cards com sombra sutil

### Redes Sociais

- Manter consistência visual com paleta
- Logo sempre visível
- Usar templates padronizados
- Tipografia consistente

### Documentos Profissionais

- **Propostas:** Header azul marinho, acentos em verde
- **Relatórios:** Layout limpo, gráficos com cores da paleta
- **Contratos:** Estilo formal, header discreto com logo
- **Cartões de visita:** Minimalista, informações essenciais

---

## Checklist de Aplicação

Antes de finalizar qualquer material, verifique:

- [ ] Cores correspondem à paleta oficial definida?
- [ ] Títulos em Playfair Display, corpo em DM Sans?
- [ ] Logo aplicado corretamente, sem distorções ou efeitos?
- [ ] Contraste de cores é adequado para legibilidade?
- [ ] Layout é limpo com espaçamento generoso?
- [ ] Área de proteção do logo foi respeitada?

---

## CSS Variables (Web)

```css
:root {
  /* Cores Primárias */
  --color-primary: #0f172a;
  --color-secondary: #059669;
  --color-accent: #06b6d4;
  
  /* Cores Neutras */
  --color-white: #ffffff;
  --color-gray-50: #f8fafc;
  --color-gray-500: #64748b;
  --color-gray-700: #334155;
  
  /* Tipografia */
  --font-heading: 'Playfair Display', serif;
  --font-body: 'DM Sans', sans-serif;
  
  /* Tamanhos */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 2.25rem;
  --text-4xl: 3rem;
}
```

---

## Tailwind CSS Config

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'rafa-navy': '#0f172a',
        'rafa-green': '#059669',
        'rafa-cyan': '#06b6d4',
      },
      fontFamily: {
        'heading': ['Playfair Display', 'serif'],
        'body': ['DM Sans', 'sans-serif'],
      },
    },
  },
}
```

---

## Contato

**Rafa Labs**
- Website: [rafalabs.com.br](https://rafalabs.com.br)
- E-mail: contato@rafalabs.com.br

---

*Documento atualizado em: Novembro 2025*
*Versão: 1.0*
