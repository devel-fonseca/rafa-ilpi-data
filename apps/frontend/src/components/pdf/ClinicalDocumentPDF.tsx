import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { normalizeUTCDate } from '@/utils/dateHelpers'
import { devLogger } from '@/utils/devLogger'

// Estilos do documento PDF
const styles = StyleSheet.create({
  page: {
    padding: '10mm 15mm',
    fontFamily: 'Helvetica',
    fontSize: 12,
    lineHeight: 1.5,
    color: '#000',
  },
  // Cabeçalho institucional
  institutionalHeader: {
    flexDirection: 'row',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
  },
  institutionalLogo: {
    width: 60,
    height: 60,
    marginRight: 15,
  },
  institutionalContent: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  institutionalName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  institutionalText: {
    fontSize: 9,
    marginBottom: 2,
  },
  // Dados do residente
  residentInfo: {
    marginBottom: 15,
    paddingBottom: 10,
  },
  residentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  residentText: {
    fontSize: 10,
  },
  bold: {
    fontWeight: 'bold',
  },
  // Título do documento
  documentTitle: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 15,
  },
  // Conteúdo formatado
  content: {
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'justify',
  },
  // Parágrafos
  paragraph: {
    marginBottom: 10,
  },
  // Títulos (H1, H2, H3)
  h1: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  h2: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  h3: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 6,
  },
  // Formatações inline
  strong: {
    fontWeight: 'bold',
  },
  em: {
    fontStyle: 'italic',
  },
  underline: {
    textDecoration: 'underline',
  },
  // Listas
  listItem: {
    flexDirection: 'row',
    marginBottom: 5,
    paddingLeft: 20,
  },
  listBullet: {
    width: 15,
    marginRight: 5,
  },
  listContent: {
    flex: 1,
  },
  // Assinatura Eletrônica (RDC 502/2021)
  signature: {
    marginTop: 50,
    alignItems: 'center',
  },
  signatureBox: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderTopStyle: 'solid',
    paddingTop: 15,
    alignItems: 'center',
    minWidth: '60%',
  },
  signatureProfessional: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 1,
    textAlign: 'center',
  },
  signatureProfessionCouncil: {
    fontSize: 8,
    marginBottom: 4,
    color: '#333',
    textAlign: 'center',
  },
  signatureElectronic: {
    fontSize: 8,
    marginBottom: 1,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  signatureTimestamp: {
    fontSize: 8,
    color: '#666',
    textAlign: 'center',
  },
  // Rodapé com nota de auditoria
  footer: {
    marginTop: 'auto',
    paddingTop: 10,
    fontSize: 7,
    color: '#000',
    borderTopWidth: 0.5,
    borderTopColor: '#000',
    borderTopStyle: 'solid',
  },
  footerText: {
    fontStyle: 'italic',
    textAlign: 'left',
  },
})

interface ClinicalDocumentPDFProps {
  title: string
  content: React.ReactNode // Conteúdo já convertido de HTML
  resident: {
    fullName: string
    age: number
    cpf: string
    cns?: string // Cartão Nacional de Saúde
    admissionDate?: string // Data de admissão na ILPI
  }
  professional: {
    name: string
    profession?: string // Ex: "Médico", "Enfermeira", "Psicólogo"
    council?: string // Ex: "CRM", "COREN", "CRP"
    councilNumber?: string // Ex: "123456"
    councilState?: string // Ex: "SP"
  }
  date: string
  documentId?: string // UUID para rastreabilidade
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

export function ClinicalDocumentPDF({
  title,
  content,
  resident,
  professional,
  date,
  documentId,
  institutionalData,
}: ClinicalDocumentPDFProps) {
  // Debug: Log da URL do logo
  if (institutionalData?.logoUrl) {
    devLogger.log('🖼️ [ClinicalDocumentPDF] Logo URL:', institutionalData.logoUrl)
  }

  // Gerar ID único se não fornecido (para rastreabilidade)
  const traceId = documentId || `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho Institucional */}
        {institutionalData && (
          <View style={styles.institutionalHeader}>
            {/* Logo (se disponível) */}
            {institutionalData.logoUrl && (
              <Image
                src={institutionalData.logoUrl}
                style={styles.institutionalLogo}
              />
            )}

            {/* Informações institucionais */}
            <View style={styles.institutionalContent}>
              <Text style={styles.institutionalName}>
                {institutionalData.tenantName || 'INSTITUIÇÃO'}
              </Text>

              {(institutionalData.cnpj || institutionalData.cnesCode) && (
                <Text style={styles.institutionalText}>
                  {institutionalData.cnpj && `CNPJ: ${institutionalData.cnpj}`}
                  {institutionalData.cnpj && institutionalData.cnesCode && ' | '}
                  {institutionalData.cnesCode && `CNES: ${institutionalData.cnesCode}`}
                </Text>
              )}

              {institutionalData.addressStreet && (
                <Text style={styles.institutionalText}>
                  {institutionalData.addressStreet}
                  {institutionalData.addressNumber && `, ${institutionalData.addressNumber}`}
                  {institutionalData.addressDistrict && ` - ${institutionalData.addressDistrict}`}
                  {institutionalData.addressCity && ` - ${institutionalData.addressCity}`}
                  {institutionalData.addressState && `/${institutionalData.addressState}`}
                  {institutionalData.addressZipCode && ` - CEP: ${institutionalData.addressZipCode}`}
                </Text>
              )}

              {(institutionalData.phone || institutionalData.email) && (
                <Text style={styles.institutionalText}>
                  {institutionalData.phone && `Tel: ${institutionalData.phone}`}
                  {institutionalData.phone && institutionalData.email && ' | '}
                  {institutionalData.email && `E-mail: ${institutionalData.email}`}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Dados do Residente */}
        <View style={styles.residentInfo}>
          {/* Linha 1: Residente e Idade */}
          <View style={styles.residentRow}>
            <Text style={styles.residentText}>
              <Text style={styles.bold}>Residente:</Text> {resident.fullName}
            </Text>
            <Text style={styles.residentText}>
              <Text style={styles.bold}>Idade:</Text> {resident.age} anos
            </Text>
          </View>

          {/* Linha 2: CPF | CNS e Admissão */}
          <View style={styles.residentRow}>
            <Text style={styles.residentText}>
              <Text style={styles.bold}>CPF:</Text> {resident.cpf}
              {resident.cns && (
                <>
                  {' | '}
                  <Text style={styles.bold}>CNS:</Text> {resident.cns}
                </>
              )}
            </Text>
            {resident.admissionDate && (
              <Text style={styles.residentText}>
                <Text style={styles.bold}>Admissão:</Text>{' '}
                {format(new Date(resident.admissionDate), 'dd/MM/yyyy')}
              </Text>
            )}
          </View>

          {/* Linha 3: Data do documento */}
          <Text style={styles.residentText}>
            <Text style={styles.bold}>Data:</Text>{' '}
            {format(normalizeUTCDate(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </Text>
        </View>

        {/* Título do Documento */}
        <Text style={styles.documentTitle}>{title}</Text>

        {/* Conteúdo Formatado */}
        <View style={styles.content}>{content}</View>

        {/* Assinatura Eletrônica (RDC 502/2021) */}
        <View style={styles.signature}>
          <View style={styles.signatureBox}>
            {/* Nome completo do profissional */}
            <Text style={styles.signatureProfessional}>{professional.name}</Text>

            {/* Profissão | Conselho + Número (mesma linha) */}
            {(professional.profession || (professional.council && professional.councilNumber)) && (
              <Text style={styles.signatureProfessionCouncil}>
                {professional.profession}
                {professional.profession && professional.council && professional.councilNumber && ' | '}
                {professional.council && professional.councilNumber && (
                  <>
                    {professional.council}
                    {professional.councilState && `-${professional.councilState}`} {professional.councilNumber}
                  </>
                )}
              </Text>
            )}

            {/* Frase indicativa de assinatura eletrônica */}
            <Text style={styles.signatureElectronic}>
              Assinado eletronicamente*
            </Text>

            {/* Data/Hora + Identificador único */}
            <Text style={styles.signatureTimestamp}>
              Data/Hora: {format(normalizeUTCDate(date), "dd/MM/yyyy '–' HH:mm", { locale: ptBR })} | ID: {traceId.slice(-12)}
            </Text>
          </View>
        </View>

        {/* Rodapé com nota de auditoria */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            * Documento assinado eletronicamente no Sistema Rafa ILPI, com registro de data, hora e identificador único para fins de auditoria.
          </Text>
        </View>
      </Page>
    </Document>
  )
}

// Exportar estilos para uso no conversor de HTML
export { styles }
