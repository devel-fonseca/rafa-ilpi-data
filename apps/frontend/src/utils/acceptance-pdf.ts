import jsPDF from 'jspdf'
import type { ContractAcceptance } from '@/api/contracts.api'
import type { PrivacyPolicyAcceptance } from '@/api/contracts.api'

/**
 * Converte Markdown para texto puro (sem conversão HTML)
 */
function markdownToPlainText(markdown: string): string {
  return markdown
    // Remove caracteres corrompidos de encoding UTF-8
    .replace(/Ø=/g, '')
    .replace(/[ÜÄÝ]/g, '')
    // Remove cabeçalhos Markdown (# ## ###)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic (**text** ou *text*)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove links [text](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove código inline `code`
    .replace(/`([^`]+)`/g, '$1')
    // Remove linhas horizontais
    .replace(/^(-{3,}|_{3,}|\*{3,})$/gm, '')
    // Converte listas em texto simples
    .replace(/^[\s]*[-*+]\s+/gm, '• ')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Limpa múltiplas linhas em branco
    .replace(/\n{3,}/g, '\n\n')
    // Remove espaços extras no final das linhas
    .replace(/\s+$/gm, '')
    .trim()
}

/**
 * Gera PDF do aceite dos Termos de Uso
 */
export function generateTermsAcceptancePDF(acceptance: ContractAcceptance) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let yPos = 20

  // ============================================================================
  // CABEÇALHO
  // ============================================================================
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('COMPROVANTE DE ACEITE', pageWidth / 2, yPos, { align: 'center' })
  yPos += 8

  doc.setFontSize(14)
  doc.text('Termos de Uso - RAFA ILPI', pageWidth / 2, yPos, { align: 'center' })
  yPos += 15

  // ============================================================================
  // INFORMAÇÕES DO ACEITE
  // ============================================================================
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('IDENTIFICAÇÃO PARA FINS DE REGISTRO DO ACEITE', margin, yPos)
  yPos += 7

  doc.setFont('helvetica', 'normal')

  // Dados do Contratante (Tenant)
  doc.setFont('helvetica', 'bold')
  doc.text('Pessoa Jurídica (Contratante):', margin, yPos)
  yPos += 5
  doc.setFont('helvetica', 'normal')
  doc.text(`Nome: ${acceptance.tenant?.name || 'N/A'}`, margin + 5, yPos)
  yPos += 5
  doc.text(`E-mail: ${acceptance.tenant?.email || 'N/A'}`, margin + 5, yPos)
  yPos += 8

  // Dados do Responsável pelo Aceite
  doc.setFont('helvetica', 'bold')
  doc.text('Pessoa Física (Responsável pelo aceite):', margin, yPos)
  yPos += 5
  doc.setFont('helvetica', 'normal')
  doc.text(`Nome: ${acceptance.user?.name || 'N/A'}`, margin + 5, yPos)
  yPos += 5
  doc.text(`E-mail: ${acceptance.user?.email || 'N/A'}`, margin + 5, yPos)
  yPos += 8

  // Dados do Aceite - MESMA LINHA
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Data:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date(acceptance.acceptedAt).toLocaleString('pt-BR'), margin + 13, yPos)

  doc.setFont('helvetica', 'bold')
  doc.text('Versão:', margin + 70, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(acceptance.termsVersion, margin + 85, yPos)

  doc.setFont('helvetica', 'bold')
  doc.text('IP:', margin + 105, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(acceptance.ipAddress, margin + 113, yPos)
  yPos += 8

  // ============================================================================
  // INFORMAÇÕES TÉCNICAS DO NAVEGADOR
  // ============================================================================
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('User Agent:', margin, yPos)
  yPos += 4

  doc.setFont('courier', 'normal')
  doc.setFontSize(7)
  const userAgentLines = doc.splitTextToSize(acceptance.userAgent, contentWidth)
  doc.text(userAgentLines, margin, yPos)
  yPos += userAgentLines.length * 3 + 6

  // ============================================================================
  // HASH SHA-256 (PROVA DE INTEGRIDADE)
  // ============================================================================
  // Borda simples (sem fundo)
  doc.setDrawColor(100, 100, 100) // Cinza
  doc.rect(margin, yPos, contentWidth, 22)

  yPos += 5
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0) // Preto
  doc.text('Hash SHA-256 (Prova de Integridade):', margin + 2, yPos)
  yPos += 5

  doc.setFont('courier', 'normal')
  doc.setFontSize(7)
  const hashLines = doc.splitTextToSize(acceptance.termsHash, contentWidth - 4)
  doc.text(hashLines, margin + 2, yPos)
  yPos += hashLines.length * 3 + 3

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  const integrityText = doc.splitTextToSize(
    'Este hash criptográfico garante que o conteúdo do termo de uso aceito não foi alterado desde o momento da aceitação, servindo como prova jurídica de integridade.',
    contentWidth - 4
  )
  doc.text(integrityText, margin + 2, yPos)
  yPos += integrityText.length * 2.5 + 10

  doc.setTextColor(0, 0, 0) // Reset to black

  // ============================================================================
  // CONTEÚDO DO TERMO
  // ============================================================================
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('TÍTULO DO TERMO DE USO', margin, yPos)
  yPos += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  const titleLines = doc.splitTextToSize(
    acceptance.terms?.title || 'Termo de Aceite e Termos de Uso',
    contentWidth
  )
  doc.text(titleLines, margin, yPos)
  yPos += titleLines.length * 5 + 8

  // Linha separadora
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 6

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('CONTEÚDO COMPLETO', margin, yPos)
  yPos += 6

  // Remover HTML tags e formatar texto
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = acceptance.termsContent
  const plainText = tempDiv.textContent || tempDiv.innerText || ''

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const lines = doc.splitTextToSize(plainText, contentWidth)

  for (let i = 0; i < lines.length; i++) {
    if (yPos > 270) {
      doc.addPage()
      yPos = 20
    }
    doc.text(lines[i], margin, yPos)
    yPos += 4
  }

  // ============================================================================
  // HASH SHA-256 NO FINAL DO DOCUMENTO (Assinatura Digital)
  // ============================================================================
  // Verificar se precisa de nova página
  if (yPos > 250) {
    doc.addPage()
    yPos = 20
  } else {
    yPos += 10
  }

  // Linha separadora
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 8

  // Borda simples (sem fundo)
  doc.setDrawColor(100, 100, 100) // Cinza
  doc.rect(margin, yPos, contentWidth, 18)

  yPos += 5
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0) // Preto
  doc.text('Hash SHA-256 (Assinatura Digital):', margin + 2, yPos)
  yPos += 4

  doc.setFont('courier', 'normal')
  doc.setFontSize(7)
  const hashLinesEnd = doc.splitTextToSize(acceptance.termsHash, contentWidth - 4)
  doc.text(hashLinesEnd, margin + 2, yPos)
  yPos += hashLinesEnd.length * 3 + 2

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.text(
    'Hash de integridade do documento aceito.',
    margin + 2,
    yPos
  )

  // ============================================================================
  // RODAPÉ COM DATA DE GERAÇÃO (em todas as páginas)
  // ============================================================================
  const totalPages = doc.getNumberOfPages()
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page)
    const footerY = doc.internal.pageSize.getHeight() - 15
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 100, 100)
    doc.text(
      `Documento gerado em ${new Date().toLocaleString('pt-BR')} via RAFA ILPI`,
      pageWidth / 2,
      footerY,
      { align: 'center' }
    )
  }

  // ============================================================================
  // SALVAR PDF
  // ============================================================================
  const fileName = `termos-uso-${acceptance.termsVersion}-${acceptance.tenant?.name?.replace(/\s+/g, '-') || 'tenant'}-${new Date().getTime()}.pdf`
  doc.save(fileName)
}

/**
 * Gera PDF do aceite da Política de Privacidade
 */
export function generatePrivacyPolicyAcceptancePDF(acceptance: PrivacyPolicyAcceptance) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let yPos = 20

  // ============================================================================
  // CABEÇALHO
  // ============================================================================
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('COMPROVANTE DE ACEITE', pageWidth / 2, yPos, { align: 'center' })
  yPos += 8

  doc.setFontSize(14)
  doc.text('Política de Privacidade - RAFA ILPI', pageWidth / 2, yPos, { align: 'center' })
  yPos += 15

  // ============================================================================
  // INFORMAÇÕES DO ACEITE
  // ============================================================================
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('IDENTIFICAÇÃO PARA FINS DE REGISTRO DO ACEITE', margin, yPos)
  yPos += 7

  doc.setFont('helvetica', 'normal')

  // Dados do Responsável pelo Aceite
  doc.setFont('helvetica', 'bold')
  doc.text('Pessoa Física (Responsável pelo aceite):', margin, yPos)
  yPos += 5
  doc.setFont('helvetica', 'normal')
  doc.text(`Nome: ${acceptance.user?.name || 'N/A'}`, margin + 5, yPos)
  yPos += 5
  doc.text(`E-mail: ${acceptance.user?.email || 'N/A'}`, margin + 5, yPos)
  yPos += 8

  // Dados do Aceite - DUAS LINHAS
  doc.setFontSize(9)

  // Linha 1: Versão | Vigência da Política
  doc.setFont('helvetica', 'bold')
  doc.text('Versão:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(acceptance.policyVersion, margin + 15, yPos)

  doc.setFont('helvetica', 'bold')
  doc.text('| Vigência da Política:', margin + 28, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(
    acceptance.policyEffectiveDate || 'N/A',
    margin + 68,
    yPos
  )
  yPos += 5

  // Linha 2: Data do aceite | Endereço IP
  doc.setFont('helvetica', 'bold')
  doc.text('Data do aceite:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(
    new Date(acceptance.acceptedAt).toLocaleString('pt-BR'),
    margin + 32,
    yPos
  )

  doc.setFont('helvetica', 'bold')
  doc.text('| Endereço IP:', margin + 80, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(acceptance.ipAddress, margin + 108, yPos)
  yPos += 8

  // ============================================================================
  // DECLARAÇÕES LGPD
  // ============================================================================
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('DECLARAÇÕES LGPD', margin, yPos)
  yPos += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  const checkmark = acceptance.lgpdIsDataController ? '☑' : '☐'
  doc.text(`${checkmark} Declaro que sou controlador de dados`, margin + 5, yPos)
  yPos += 5

  const checkmark2 = acceptance.lgpdHasLegalBasis ? '☑' : '☐'
  doc.text(`${checkmark2} Declaro que possuo base legal para tratamento de dados`, margin + 5, yPos)
  yPos += 5

  const checkmark3 = acceptance.lgpdAcknowledgesResponsibility ? '☑' : '☐'
  doc.text(`${checkmark3} Reconheço minha responsabilidade como controlador`, margin + 5, yPos)
  yPos += 10

  // ============================================================================
  // CONTEÚDO DA POLÍTICA
  // ============================================================================
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('CONTEÚDO COMPLETO DA POLÍTICA DE PRIVACIDADE', margin, yPos)
  yPos += 6

  // Converte Markdown para HTML e depois para texto puro
  const plainText = markdownToPlainText(acceptance.policyContent)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const lines = doc.splitTextToSize(plainText, contentWidth)

  for (let i = 0; i < lines.length; i++) {
    if (yPos > 270) {
      doc.addPage()
      yPos = 20
    }
    doc.text(lines[i], margin, yPos)
    yPos += 4
  }

  // ============================================================================
  // RODAPÉ COM DATA DE GERAÇÃO (em todas as páginas)
  // ============================================================================
  const totalPages = doc.getNumberOfPages()
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page)
    const footerY = doc.internal.pageSize.getHeight() - 15
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 100, 100)
    doc.text(
      `Documento gerado em ${new Date().toLocaleString('pt-BR')} via RAFA ILPI`,
      pageWidth / 2,
      footerY,
      { align: 'center' }
    )
  }

  // ============================================================================
  // SALVAR PDF
  // ============================================================================
  const fileName = `politica-privacidade-${acceptance.policyVersion}-${new Date().getTime()}.pdf`
  doc.save(fileName)
}
