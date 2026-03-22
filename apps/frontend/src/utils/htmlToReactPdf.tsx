import { Text, View, Link } from '@react-pdf/renderer'
import { styles } from '@/components/pdf/ClinicalDocumentPDF'
import { devLogger } from '@/utils/devLogger'

/**
 * Converte HTML do Tiptap para componentes React-PDF
 *
 * O Tiptap gera HTML com tags como <p>, <strong>, <em>, <u>, <h1-h3>, <ul>, <ol>, <li>, <a>
 * Esta função parseia esse HTML e retorna componentes React-PDF correspondentes
 */

interface ParsedNode {
  type: string
  content?: string
  children?: ParsedNode[]
  attrs?: Record<string, unknown>
}

/**
 * Parse HTML string para estrutura de nós
 */
function parseHTML(html: string): ParsedNode[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  function parseNode(node: Node): ParsedNode | null {
    // Nó de texto
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      if (!text) return null
      return { type: 'text', content: text }
    }

    // Nó de elemento
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element
      const tagName = element.tagName.toLowerCase()

      const parsed: ParsedNode = {
        type: tagName,
        children: [],
        attrs: {},
      }

      // Extrair atributos (ex: href para links)
      if (tagName === 'a') {
        parsed.attrs!.href = element.getAttribute('href') || ''
      }

      // Parsear filhos
      Array.from(element.childNodes).forEach((child) => {
        const parsedChild = parseNode(child)
        if (parsedChild) {
          parsed.children!.push(parsedChild)
        }
      })

      return parsed
    }

    return null
  }

  const nodes: ParsedNode[] = []
  Array.from(doc.body.childNodes).forEach((node) => {
    const parsed = parseNode(node)
    if (parsed) {
      nodes.push(parsed)
    }
  })

  return nodes
}

/**
 * Renderiza nós parseados como componentes React-PDF
 */
function renderNodes(nodes: ParsedNode[], parentType?: string): React.ReactNode {
  return nodes.map((node, index) => {
    const key = `${node.type}-${index}`

    // Texto simples
    if (node.type === 'text') {
      return node.content
    }

    // Parágrafos
    if (node.type === 'p') {
      return (
        <Text key={key} style={styles.paragraph}>
          {node.children && renderNodes(node.children, 'p')}
        </Text>
      )
    }

    // Títulos
    if (node.type === 'h1') {
      return (
        <Text key={key} style={styles.h1}>
          {node.children && renderNodes(node.children, 'h1')}
        </Text>
      )
    }

    if (node.type === 'h2') {
      return (
        <Text key={key} style={styles.h2}>
          {node.children && renderNodes(node.children, 'h2')}
        </Text>
      )
    }

    if (node.type === 'h3') {
      return (
        <Text key={key} style={styles.h3}>
          {node.children && renderNodes(node.children, 'h3')}
        </Text>
      )
    }

    // Negrito
    if (node.type === 'strong') {
      return (
        <Text key={key} style={styles.strong}>
          {node.children && renderNodes(node.children, parentType)}
        </Text>
      )
    }

    // Itálico
    if (node.type === 'em') {
      return (
        <Text key={key} style={styles.em}>
          {node.children && renderNodes(node.children, parentType)}
        </Text>
      )
    }

    // Sublinhado
    if (node.type === 'u') {
      return (
        <Text key={key} style={styles.underline}>
          {node.children && renderNodes(node.children, parentType)}
        </Text>
      )
    }

    // Links
    if (node.type === 'a') {
      const href = typeof node.attrs?.href === 'string' ? node.attrs.href : '#'
      return (
        <Link key={key} src={href} style={{ color: '#0066cc' }}>
          {node.children && renderNodes(node.children, parentType)}
        </Link>
      )
    }

    // Listas não ordenadas
    if (node.type === 'ul') {
      return (
        <View key={key} style={{ marginBottom: 10 }}>
          {node.children &&
            node.children.map((child, i) => {
              if (child.type === 'li') {
                return (
                  <View key={`li-${i}`} style={styles.listItem}>
                    <Text style={styles.listBullet}>•</Text>
                    <View style={styles.listContent}>
                      {child.children && renderNodes(child.children, 'li')}
                    </View>
                  </View>
                )
              }
              return null
            })}
        </View>
      )
    }

    // Listas ordenadas
    if (node.type === 'ol') {
      return (
        <View key={key} style={{ marginBottom: 10 }}>
          {node.children &&
            node.children.map((child, i) => {
              if (child.type === 'li') {
                return (
                  <View key={`li-${i}`} style={styles.listItem}>
                    <Text style={styles.listBullet}>{i + 1}.</Text>
                    <View style={styles.listContent}>
                      {child.children && renderNodes(child.children, 'li')}
                    </View>
                  </View>
                )
              }
              return null
            })}
        </View>
      )
    }

    // Quebra de linha
    if (node.type === 'br') {
      return <Text key={key}>{'\n'}</Text>
    }

    // Fallback: renderizar filhos sem wrapper específico
    if (node.children) {
      return <View key={key}>{renderNodes(node.children, parentType)}</View>
    }

    return null
  })
}

/**
 * Função principal: converte HTML do Tiptap para React-PDF
 *
 * @param html HTML gerado pelo Tiptap editor
 * @returns ReactNode com componentes React-PDF
 */
export function convertTiptapHtmlToReactPdf(html: string): React.ReactNode {
  devLogger.log('🔄 [htmlToReactPdf] Convertendo HTML para React-PDF...', {
    htmlLength: html.length,
    htmlPreview: html.substring(0, 100),
  })

  try {
    const nodes = parseHTML(html)
    devLogger.log('✅ [htmlToReactPdf] HTML parseado com sucesso', {
      nodesCount: nodes.length,
      nodes: nodes.map((n) => n.type),
    })

    const reactPdfContent = renderNodes(nodes)
    devLogger.log('✅ [htmlToReactPdf] Componentes React-PDF gerados')

    return reactPdfContent
  } catch (error) {
    console.error('❌ [htmlToReactPdf] Erro ao converter HTML:', error)
    // Fallback: retornar texto simples
    return (
      <Text style={styles.paragraph}>
        [Erro ao processar formatação do documento. Conteúdo HTML: {html.substring(0, 200)}...]
      </Text>
    )
  }
}
