import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ResidentDocument from '@/components/residents/ResidentDocument'
import { useResident } from '@/hooks/useResidents'
import { useTenant } from '@/hooks/useTenant'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export function ResidentPrintView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const documentRef = useRef<HTMLDivElement>(null)

  const [isPrinting, setIsPrinting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Buscar dados do residente e tenant usando React Query
  const { data: residentData, isLoading: isLoadingResident, error: residentError } = useResident(id || '')
  const { data: tenantData, isLoading: isLoadingTenant, error: tenantError } = useTenant()

  const isLoading = isLoadingResident || isLoadingTenant

  // Transformar dados do tenant para o formato esperado pelo ResidentDocument
  const formattedTenantData = tenantData ? {
    name: tenantData.name,
    address: tenantData.addressStreet || '',
    addressNumber: tenantData.addressNumber || '',
    addressDistrict: tenantData.addressDistrict || '',
    addressCity: tenantData.addressCity || '',
    addressState: tenantData.addressState || '',
    addressZipCode: tenantData.addressZipCode || '',
    cnpj: tenantData.cnpj,
    phone: tenantData.phone || ''
  } : null

  // Função de impressão
  const handlePrint = () => {
    setIsPrinting(true)

    // Usar setTimeout para garantir que o React renderizou com isPrinting=true
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 100)
  }

  // Função de exportação para PDF
  const handleExportPDF = async () => {
    if (!documentRef.current || !residentData) return

    setIsExporting(true)
    setIsPrinting(true) // Ativar modo de impressão para remover links

    try {
      // Aguardar um pouco para o React renderizar sem os links
      await new Promise(resolve => setTimeout(resolve, 200))

      // Capturar o HTML como imagem
      const canvas = await html2canvas(documentRef.current, {
        scale: 2, // Qualidade da imagem
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })

      // Dimensões A4 em mm
      const imgWidth = 210
      const pageHeight = 297
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      const pdf = new jsPDF('p', 'mm', 'a4')

      // Se a imagem é maior que uma página, adicionar múltiplas páginas
      let heightLeft = imgHeight
      let position = 0

      // Adicionar primeira página
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        0,
        position,
        imgWidth,
        imgHeight
      )
      heightLeft -= pageHeight

      // Adicionar páginas adicionais se necessário
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          0,
          position,
          imgWidth,
          imgHeight
        )
        heightLeft -= pageHeight
      }

      // Fazer download do PDF
      const fileName = `Residente_${residentData.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)

      console.log('✅ PDF gerado com sucesso:', fileName)
    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error)
      alert('Erro ao gerar PDF. Por favor, tente novamente.')
    } finally {
      setIsExporting(false)
      setIsPrinting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    )
  }

  if (residentError || tenantError || !residentData || !formattedTenantData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">
            {residentError ? 'Erro ao carregar dados do residente' :
             tenantError ? 'Erro ao carregar dados da ILPI' :
             'Dados não encontrados'}
          </p>
          <Button onClick={() => navigate('/dashboard/residentes')} className="mt-4">
            Voltar para lista
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Cabeçalho da Página - Ocultar na impressão */}
      <div className="bg-white border-b print:hidden sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{residentData.fullName}</h1>
              <p className="text-sm text-gray-600 mt-1">Visualizando as informações do residente</p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/residentes')}
                disabled={isExporting}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>

              <Button
                variant="outline"
                onClick={handlePrint}
                disabled={isExporting}
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>

              <Button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 mr-2" />
                    Exportar PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Documento */}
      <div className="py-8 print:py-0">
        <div ref={documentRef}>
          <ResidentDocument
            resident={residentData as any}
            tenant={formattedTenantData}
            isPrinting={isPrinting}
          />
        </div>
      </div>

      {/* Estilos de impressão */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }

          @page {
            margin: 20mm;
            size: A4;
          }
        }
      `}</style>
    </div>
  )
}
