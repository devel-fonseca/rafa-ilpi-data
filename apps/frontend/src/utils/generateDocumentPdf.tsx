import { pdf } from '@react-pdf/renderer'
import { ClinicalDocumentPDF } from '@/components/pdf/ClinicalDocumentPDF'
import { convertTiptapHtmlToReactPdf } from './htmlToReactPdf'

interface GeneratePdfOptions {
  title: string
  content: string
  resident: {
    fullName: string
    birthDate: string
    cpf: string
    cns?: string
    admissionDate?: string
  }
  professional: {
    name: string
    profession?: string
    council?: string
    councilNumber?: string
    councilState?: string
  }
  date: string
  documentId?: string
  institutionalData?: {
    tenantName?: string
    logoUrl?: string
    cnpj?: string
    cnesCode?: string
    phone?: string
    email?: string
    addressStreet?: string
    addressNumber?: string
    addressDistrict?: string
    addressCity?: string
    addressState?: string
    addressZipCode?: string
  }
}

/**
 * Calcula idade a partir da data de nascimento
 */
function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

/**
 * Gera PDF a partir de conteúdo HTML formatado usando @react-pdf/renderer
 *
 * Layout do PDF:
 * - Cabeçalho institucional (logo + dados)
 * - Dados do residente (nome, idade, CPF, data)
 * - Título centralizado e em negrito
 * - Conteúdo formatado (Tiptap HTML convertido para React-PDF)
 * - Assinatura do profissional
 *
 * @param options Dados para gerar o PDF
 * @returns Promise com o Blob do PDF gerado
 */
export async function generateDocumentPdf(options: GeneratePdfOptions): Promise<Blob> {
  console.log('🔧 [generateDocumentPdf] Iniciando geração com @react-pdf/renderer...', {
    hasTitle: !!options.title,
    hasContent: !!options.content,
    contentLength: options.content?.length || 0,
    hasResident: !!options.resident,
    hasInstitutionalData: !!options.institutionalData,
    institutionalData: options.institutionalData,
  })

  try {
    // Calcular idade
    const age = calculateAge(new Date(options.resident.birthDate))

    // Converter HTML do Tiptap para componentes React-PDF
    console.log('🔄 [generateDocumentPdf] Convertendo HTML do Tiptap...')
    const contentComponents = convertTiptapHtmlToReactPdf(options.content)

    // Criar componente PDF
    console.log('📄 [generateDocumentPdf] Criando documento PDF...')
    const pdfDocument = (
      <ClinicalDocumentPDF
        title={options.title}
        content={contentComponents}
        resident={{
          fullName: options.resident.fullName,
          age,
          cpf: options.resident.cpf,
          cns: options.resident.cns,
          admissionDate: options.resident.admissionDate,
        }}
        professional={options.professional}
        date={options.date}
        documentId={options.documentId}
        institutionalData={options.institutionalData}
      />
    )

    // Gerar PDF
    console.log('⚙️ [generateDocumentPdf] Renderizando PDF...')
    const pdfBlob = await pdf(pdfDocument).toBlob()

    console.log('✅ [generateDocumentPdf] PDF gerado com sucesso!', {
      blobSize: pdfBlob.size,
      blobType: pdfBlob.type,
    })

    return pdfBlob
  } catch (error) {
    console.error('❌ [generateDocumentPdf] Erro ao gerar PDF:', error)
    throw error
  }
}
