import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ResidentDocument from '@/components/residents/ResidentDocument'
import { useResident } from '@/hooks/useResidents'
import { useTenant } from '@/hooks/useTenant'
import { useProfile } from '@/hooks/useInstitutionalProfile'
import html2pdf from 'html2pdf.js'

export function ResidentPrintView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const documentRef = useRef<HTMLDivElement>(null)

  const [isPrinting, setIsPrinting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Buscar dados do residente, tenant e perfil institucional usando React Query
  const { data: residentData, isLoading: isLoadingResident, error: residentError } = useResident(id || '')
  const { data: tenantData, isLoading: isLoadingTenant, error: tenantError } = useTenant()
  const { data: profileData, isLoading: isLoadingProfile } = useProfile()

  const isLoading = isLoadingResident || isLoadingTenant || isLoadingProfile

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
    phone: tenantData.phone || '',
    logoUrl: profileData?.logoUrl || null
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

    try {
      // Criar um elemento clone para exportação (sem elementos de UI)
      const element = documentRef.current.querySelector('.print-container') as HTMLElement
      if (!element) return

      const fileName = `Residente_${residentData.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`

      const opt = {
        margin: [10, 15, 10, 15] as [number, number, number, number], // top, left, bottom, right em mm
        filename: fileName,
        image: { type: 'png' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
        jsPDF: { orientation: 'p', unit: 'mm', format: 'a4' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      }

      await html2pdf().set(opt).from(element).save()

      console.log('✅ PDF gerado com sucesso:', fileName)
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

  if (residentError || tenantError || !residentData || !formattedTenantData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">
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
    <div className="min-h-screen bg-muted print:bg-white">
      {/* Cabeçalho da Página - Ocultar na impressão */}
      <div className="bg-white border-b print:hidden sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{residentData.fullName}</h1>
              <p className="text-sm text-muted-foreground mt-1">Visualizando as informações do residente</p>
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
