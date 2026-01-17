import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Printer, FileDown, Loader2 } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import { Button } from '@/components/ui/button'
import ResidentDocument from '@/components/residents/ResidentDocument'
import { useResident } from '@/hooks/useResidents'
// TODO: Migrar para @react-pdf/renderer
// import html2pdf from 'html2pdf.js'
import { getCurrentDate } from '@/utils/dateHelpers'
import { Page, PageHeader } from '@/design-system/components'

export function ResidentPrintView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const printRef = useRef<HTMLDivElement>(null)

  const [isExporting, setIsExporting] = useState(false)

  // Buscar dados do residente usando React Query
  const { data: residentData, isLoading: isLoadingResident, error: residentError } = useResident(id || '')

  const isLoading = isLoadingResident

  // Função de impressão usando react-to-print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Registro_Residente_${residentData?.fullName.replace(/\s/g, '_')}_${getCurrentDate()}`,
  })

  // Função de exportação para PDF
  // TODO: Migrar para @react-pdf/renderer
  const handleExportPDF = async () => {
    if (!printRef.current || !residentData) return

    setIsExporting(true)

    try {
      alert('Funcionalidade de exportação para PDF temporariamente desabilitada. Será migrada para @react-pdf/renderer.')
      // Criar um elemento clone para exportação (sem elementos de UI)
      // const element = printRef.current.querySelector('.print-container') as HTMLElement
      // if (!element) return

      // const fileName = `Residente_${residentData.fullName.replace(/\s+/g, '_')}_${getCurrentDate()}.pdf`

      // const opt = {
      //   margin: [10, 15, 10, 15] as [number, number, number, number], // top, left, bottom, right em mm
      //   filename: fileName,
      //   image: { type: 'png' as const, quality: 0.98 },
      //   html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
      //   jsPDF: { orientation: 'p', unit: 'mm', format: 'a4' },
      //   pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      // }

      // await html2pdf().set(opt).from(element).save()

      // console.log('✅ PDF gerado com sucesso:', fileName)
    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error)
      alert('Erro ao gerar PDF. Por favor, tente novamente.')
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    )
  }

  if (residentError || !residentData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">
            {residentError ? 'Erro ao carregar dados do residente' : 'Dados não encontrados'}
          </p>
          <Button onClick={() => navigate('/dashboard/residentes')} className="mt-4">
            Voltar para lista
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Page className="min-h-screen bg-muted print:bg-white">
      <div className="print:hidden">
        <PageHeader
          title={residentData.fullName}
          subtitle="Visualizando as informações do residente"
          onBack={() => navigate('/dashboard/residentes')}
          actions={
            <div className="flex gap-3">
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
                variant="danger"
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
          }
        />
      </div>

      {/* Documento */}
      <div className="py-8 print:py-0">
        <div ref={printRef}>
          <ResidentDocument
            resident={residentData as Record<string, unknown>}
            isPrinting={false}
          />
        </div>
      </div>

      {/* Estilos de impressão */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .print-container {
            max-width: 100% !important;
            padding: 0 !important;
          }

          /* Esconder elementos que não devem aparecer na impressão */
          .print-hide,
          button,
          nav,
          header:not(.print-only) {
            display: none !important;
          }

          /* Garantir que elementos de impressão apareçam */
          .print-only {
            display: block !important;
          }

          /* Estilos para quebras de página */
          .print-avoid-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          @page {
            margin: 20mm;
            size: A4;
          }
        }
      `}</style>
    </Page>
  )
}
