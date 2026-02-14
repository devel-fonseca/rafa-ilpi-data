/* eslint-disable no-restricted-syntax */
import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  FileText,
  Plus,
  Download,
  Upload,
  Eye,
  XCircle,
  CheckCircle,
  Clock,
} from 'lucide-react'

import { useProfile } from '@/hooks/useInstitutionalProfile'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { uploadSignedTerm, cancelTerm, getTermPrintData } from '@/api/belongings.api'
import {
  BelongingTermStatus,
  TERM_TYPE_LABELS,
  TERM_STATUS_LABELS,
  type BelongingTerm,
} from '@/types/belongings'

interface TermsHistoryProps {
  residentId: string
  terms: BelongingTerm[]
  isLoading?: boolean
  onGenerateTerm: () => void
}

function getStatusIcon(status: BelongingTermStatus) {
  switch (status) {
    case BelongingTermStatus.ASSINADO:
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case BelongingTermStatus.PENDENTE:
      return <Clock className="h-4 w-4 text-yellow-500" />
    case BelongingTermStatus.CANCELADO:
      return <XCircle className="h-4 w-4 text-red-500" />
    default:
      return null
  }
}

function getStatusBadgeVariant(status: BelongingTermStatus) {
  switch (status) {
    case BelongingTermStatus.ASSINADO:
      return 'default'
    case BelongingTermStatus.PENDENTE:
      return 'secondary'
    case BelongingTermStatus.CANCELADO:
      return 'destructive'
    default:
      return 'default'
  }
}

export function TermsHistory({
  residentId,
  terms,
  isLoading,
  onGenerateTerm,
}: TermsHistoryProps) {
  const queryClient = useQueryClient()
  const { data: profileData } = useProfile()
  const [uploadDialog, setUploadDialog] = useState<{
    open: boolean
    termId?: string
    termNumber?: string
  }>({ open: false })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const uploadMutation = useMutation({
    mutationFn: ({ termId, file }: { termId: string; file: File }) =>
      uploadSignedTerm(residentId, termId, file),
    onSuccess: () => {
      toast.success('Termo assinado enviado com sucesso')
      queryClient.invalidateQueries({ queryKey: ['belonging-terms', residentId] })
      setUploadDialog({ open: false })
      setSelectedFile(null)
    },
    onError: () => {
      toast.error('Erro ao enviar termo assinado')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: ({ termId, reason }: { termId: string; reason: string }) =>
      cancelTerm(residentId, termId, reason),
    onSuccess: () => {
      toast.success('Termo cancelado')
      queryClient.invalidateQueries({ queryKey: ['belonging-terms', residentId] })
    },
    onError: () => {
      toast.error('Erro ao cancelar termo')
    },
  })

  const handleUpload = () => {
    if (uploadDialog.termId && selectedFile) {
      uploadMutation.mutate({ termId: uploadDialog.termId, file: selectedFile })
    }
  }

  const handleCancel = (term: BelongingTerm) => {
    const reason = prompt('Informe o motivo do cancelamento:')
    if (reason && reason.length >= 10) {
      cancelMutation.mutate({ termId: term.id, reason })
    } else if (reason) {
      toast.error('O motivo deve ter no mínimo 10 caracteres')
    }
  }

  const handlePrint = async (term: BelongingTerm) => {
    try {
      const data = await getTermPrintData(residentId, term.id)
      // Open print data in new window (simplified - would need PDF generation)
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        // Usar dados do perfil institucional
        const tenant = profileData?.tenant
        const profile = profileData?.profile

        // Montar endereço completo
        const addressParts = [
          tenant?.addressStreet,
          tenant?.addressNumber && `, ${tenant.addressNumber}`,
          tenant?.addressDistrict && ` – ${tenant.addressDistrict}`,
        ].filter(Boolean).join('')

        const cityStateParts = [
          tenant?.addressCity,
          tenant?.addressState && `/${tenant.addressState}`,
          tenant?.addressZipCode && ` – CEP ${tenant.addressZipCode}`,
        ].filter(Boolean).join('')

        printWindow.document.write(`
          <html>
            <head>
              <title>Termo ${data.term.termNumber}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 40px; }
                .header { display: flex; align-items: flex-start; gap: 16px; border-bottom: 2px solid #ddd; padding-bottom: 16px; margin-bottom: 16px; }
                .header-logo { width: 80px; height: 80px; object-fit: contain; }
                .header-logo-placeholder { width: 80px; height: 80px; background: #f5f5f5; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #999; }
                .header-info h1 { margin: 0 0 4px 0; font-size: 20px; text-transform: uppercase; }
                .header-info p { margin: 2px 0; font-size: 12px; color: #666; }
                .document-title { text-align: center; margin: 24px 0 16px 0; }
                .document-title h2 { margin: 0 0 4px 0; font-size: 18px; }
                .document-title h3 { margin: 0; font-size: 14px; font-weight: normal; color: #666; }
                .section { margin: 16px 0; }
                .section-title { font-weight: bold; font-size: 14px; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
                .info-row { margin: 4px 0; font-size: 13px; }
                .info-row strong { color: #333; }
                table { width: 100%; border-collapse: collapse; margin: 12px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                th { background-color: #f5f5f5; font-weight: bold; }
                .signatures { margin-top: 60px; display: flex; justify-content: space-between; }
                .signature-line { width: 200px; border-top: 1px solid #000; text-align: center; padding-top: 8px; font-size: 12px; }
              </style>
            </head>
            <body>
              <!-- Cabeçalho Institucional -->
              <div class="header">
                ${profile?.logoUrl
                  ? `<img src="${profile.logoUrl}" alt="Logo" class="header-logo" />`
                  : '<div class="header-logo-placeholder">LOGO</div>'
                }
                <div class="header-info">
                  <h1>${tenant?.name || 'CASA DE REPOUSO'}</h1>
                  ${tenant?.cnpj || profile?.cnesCode ? `
                    <p>
                      ${tenant?.cnpj ? `CNPJ ${tenant.cnpj}` : ''}
                      ${tenant?.cnpj && profile?.cnesCode ? ' | ' : ''}
                      ${profile?.cnesCode ? `CNES ${profile.cnesCode}` : ''}
                    </p>
                  ` : ''}
                  ${tenant?.phone || tenant?.email ? `
                    <p>
                      ${tenant?.phone ? `Tel. ${tenant.phone}` : ''}
                      ${tenant?.phone && tenant?.email ? ' | ' : ''}
                      ${tenant?.email ? `E-mail: ${tenant.email}` : ''}
                    </p>
                  ` : ''}
                  ${addressParts ? `<p>${addressParts}</p>` : ''}
                  ${cityStateParts ? `<p>${cityStateParts}</p>` : ''}
                </div>
              </div>

              <!-- Título do Documento -->
              <div class="document-title">
                <h2>TERMO DE ${TERM_TYPE_LABELS[data.term.type].toUpperCase()} DE PERTENCES</h2>
                <h3>Nº ${data.term.termNumber}</h3>
              </div>

              <!-- Dados do Residente -->
              <div class="section">
                <div class="section-title">Dados do Residente</div>
                <p class="info-row"><strong>Nome:</strong> ${data.resident.fullName}</p>
                <p class="info-row"><strong>CPF:</strong> ${data.resident.cpf}</p>
                <p class="info-row"><strong>Leito:</strong> ${data.resident.bedCode || 'Não informado'}</p>
              </div>

              <!-- Dados do Termo -->
              <div class="section">
                <div class="section-title">Dados do Termo</div>
                <p class="info-row"><strong>Data do Termo:</strong> ${format(new Date(data.term.termDate), 'dd/MM/yyyy')}</p>
                <p class="info-row"><strong>Emitido por:</strong> ${data.term.issuedBy}</p>
                ${data.term.receivedBy ? `<p class="info-row"><strong>Recebido por:</strong> ${data.term.receivedBy}${data.term.receiverDocument ? ` (${data.term.receiverDocument})` : ''}</p>` : ''}
                ${data.term.notes ? `<p class="info-row"><strong>Observações:</strong> ${data.term.notes}</p>` : ''}
              </div>

              <!-- Itens -->
              <div class="section">
                <div class="section-title">Itens (${data.totals.totalItems})</div>
                ${data.items.entradas.length > 0 ? `
                  <h4 style="margin: 12px 0 8px 0; font-size: 13px;">Entradas (${data.totals.totalEntradas})</h4>
                  <table>
                    <tr><th>Descrição</th><th>Categoria</th><th>Qtd</th><th>Estado</th></tr>
                    ${data.items.entradas.map((item: Record<string, unknown>) => `
                      <tr>
                        <td>${item.description}</td>
                        <td>${item.category}</td>
                        <td>${item.quantity}</td>
                        <td>${item.conservationState}</td>
                      </tr>
                    `).join('')}
                  </table>
                ` : ''}
                ${data.items.saidas.length > 0 ? `
                  <h4 style="margin: 12px 0 8px 0; font-size: 13px;">Saídas (${data.totals.totalSaidas})</h4>
                  <table>
                    <tr><th>Descrição</th><th>Categoria</th><th>Qtd</th><th>Estado</th></tr>
                    ${data.items.saidas.map((item: Record<string, unknown>) => `
                      <tr>
                        <td>${item.description}</td>
                        <td>${item.category}</td>
                        <td>${item.quantity}</td>
                        <td>${item.conservationState}</td>
                      </tr>
                    `).join('')}
                  </table>
                ` : ''}
              </div>

              <!-- Assinaturas -->
              <div class="signatures">
                <div class="signature-line">Responsável/Familiar</div>
                <div class="signature-line">Funcionário ILPI</div>
              </div>
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    } catch (error) {
      toast.error('Erro ao gerar impressão')
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Termos
          </CardTitle>
          <Button onClick={onGenerateTerm}>
            <Plus className="h-4 w-4 mr-2" />
            Gerar Termo
          </Button>
        </CardHeader>
        <CardContent>
          {terms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum termo gerado ainda
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terms.map((term) => (
                  <TableRow key={term.id}>
                    <TableCell className="font-mono text-sm">{term.termNumber}</TableCell>
                    <TableCell>{TERM_TYPE_LABELS[term.type]}</TableCell>
                    <TableCell>
                      {format(new Date(term.termDate), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{term._count?.items || 0}</TableCell>
                    <TableCell>
                      <Badge
                        variant={getStatusBadgeVariant(term.status)}
                        className="gap-1"
                      >
                        {getStatusIcon(term.status)}
                        {TERM_STATUS_LABELS[term.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePrint(term)}
                          title="Imprimir"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {term.status === BelongingTermStatus.PENDENTE && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setUploadDialog({
                                  open: true,
                                  termId: term.id,
                                  termNumber: term.termNumber,
                                })
                              }
                              title="Upload assinado"
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCancel(term)}
                              title="Cancelar"
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        {term.signedFileUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(term.signedFileUrl!, '_blank')}
                            title="Ver assinado"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog.open} onOpenChange={(open) => setUploadDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload de Termo Assinado</DialogTitle>
            <DialogDescription>
              Termo: {uploadDialog.termNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">Arquivo PDF *</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Apenas arquivos PDF, máximo 10MB
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialog({ open: false })
                setSelectedFile(null)
              }}
              disabled={uploadMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? 'Enviando...' : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
