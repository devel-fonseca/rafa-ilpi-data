import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import {
  useDocuments,
  useDeleteDocument,
  useProfile,
  useDocumentRequirements,
} from '@/hooks/useInstitutionalProfile'
import {
  Upload,
  Loader2,
  FileText,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Download,
  AlertCircle,
  Search,
  X,
} from 'lucide-react'
import { formatDate } from '@/utils/formatters'
import type { DocumentStatus, TenantDocument } from '@/api/institutional-profile.api'
import { DocumentUploadModal } from './DocumentUploadModal'

/**
 * Mapeamento de cores de badge por status de documento
 */
const statusBadgeVariants: Record<DocumentStatus, 'success' | 'warning' | 'danger' | 'secondary'> = {
  OK: 'success',
  VENCENDO: 'warning',
  VENCIDO: 'danger',
  PENDENTE: 'secondary',
}

/**
 * Labels amigáveis para os status
 */
const statusLabels: Record<DocumentStatus, string> = {
  OK: 'OK',
  VENCENDO: 'Vencendo',
  VENCIDO: 'Vencido',
  PENDENTE: 'Pendente',
}

/**
 * Labels amigáveis para tipos de documentos (espelhando backend)
 */
const documentTypeLabels: Record<string, string> = {
  // Documentos específicos - Associação
  ESTATUTO: 'Estatuto Social Registrado',
  ATA_DIRETORIA: 'Ata de Eleição da Diretoria',

  // Documentos específicos - Fundação
  ESCRITURA: 'Escritura de Constituição',

  // Documentos específicos - Empresa Privada
  CONTRATO_SOCIAL: 'Contrato Social / Ato Constitutivo',
  DOC_ADMINISTRADORES: 'Documentos dos Sócios/Administradores',

  // Documentos específicos - MEI
  MEI_REGISTRO: 'Certificado MEI (CCMEI)',
  DOC_MEI: 'Documentos do MEI (RG/CPF)',

  // Documentos comuns
  CMI: 'Certidão de Matrícula de Imóvel',
  DOC_REPRESENTANTE: 'Documentos do Representante Legal (RG/CPF)',
  CNPJ: 'Cadastro Nacional de Pessoa Jurídica',
  RT_INDICACAO: 'Indicação de Responsável Técnico',
  RT_DOCUMENTOS: 'Documentos do Responsável Técnico',
  ALVARA_USO: 'Alvará de Funcionamento/Uso',
  LIC_SANITARIA: 'Licença Sanitária (Vigilância Sanitária)',
  AVCB: 'Auto de Vistoria do Corpo de Bombeiros',
}

/**
 * Função auxiliar para obter o label de um tipo de documento
 */
function getDocumentTypeLabel(type: string): string {
  return documentTypeLabels[type] || type
}

/**
 * Componente principal da aba de Documentos
 */
export function DocumentsTab() {
  const { toast } = useToast()
  const { data: profile } = useProfile()
  const { data: requirements } = useDocumentRequirements(profile?.legalNature)

  // Estados para filtros
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | ''>('')
  const [searchQuery, setSearchQuery] = useState('')

  // Estado para modal de upload
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  // Buscar documentos com filtros
  const filters = {
    ...(typeFilter && { type: typeFilter }),
    ...(statusFilter && { status: statusFilter }),
  }
  const { data: documents, isLoading } = useDocuments(filters)

  // Estado para modal de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<TenantDocument | null>(null)

  // Mutation para deletar documento
  const deleteMutation = useDeleteDocument()

  /**
   * Handler para abrir diálogo de confirmação de exclusão
   */
  const handleDeleteClick = (document: TenantDocument) => {
    setDocumentToDelete(document)
    setDeleteDialogOpen(true)
  }

  /**
   * Handler para confirmar exclusão
   */
  const handleConfirmDelete = async () => {
    if (!documentToDelete) return

    try {
      await deleteMutation.mutateAsync(documentToDelete.id)
      toast({
        title: 'Sucesso',
        description: 'Documento excluído com sucesso',
      })
      setDeleteDialogOpen(false)
      setDocumentToDelete(null)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao excluir documento',
        variant: 'destructive',
      })
    }
  }

  /**
   * Handler para download de documento
   */
  const handleDownload = (document: TenantDocument) => {
    // Abrir o fileUrl em nova aba (presigned URL do S3)
    window.open(document.fileUrl, '_blank')
  }

  /**
   * Filtra documentos pela busca textual (nome do arquivo)
   */
  const filteredDocuments = documents?.filter((doc) => {
    if (!searchQuery) return true
    return (
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getDocumentTypeLabel(doc.type).toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  /**
   * Handler para limpar todos os filtros
   */
  const handleClearFilters = () => {
    setTypeFilter('')
    setStatusFilter('')
    setSearchQuery('')
  }

  /**
   * Verifica se há algum filtro ativo
   */
  const hasActiveFilters = typeFilter || statusFilter || searchQuery

  return (
    <div className="space-y-4">
      {/* Card de Filtros e Ações */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentos Institucionais
              </CardTitle>
              <CardDescription className="mt-1">
                Gerencie todos os documentos obrigatórios da instituição
              </CardDescription>
            </div>
            <Button className="flex items-center gap-2" onClick={() => setUploadModalOpen(true)}>
              <Upload className="h-4 w-4" />
              Novo Documento
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Busca por nome */}
            <div className="space-y-2">
              <Label htmlFor="search">Buscar documento</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome do arquivo ou tipo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Filtro por tipo */}
            <div className="space-y-2">
              <Label htmlFor="type-filter">Tipo de documento</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger id="type-filter">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os tipos</SelectItem>
                  {requirements?.required.map((req) => (
                    <SelectItem key={req.type} value={req.type}>
                      {req.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por status */}
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as DocumentStatus | '')}
              >
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os status</SelectItem>
                  <SelectItem value="OK">OK</SelectItem>
                  <SelectItem value="VENCENDO">Vencendo</SelectItem>
                  <SelectItem value="VENCIDO">Vencido</SelectItem>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botão de limpar filtros */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Documentos */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            // Estado de loading
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !filteredDocuments || filteredDocuments.length === 0 ? (
            // Estado vazio
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">Nenhum documento encontrado</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                {hasActiveFilters
                  ? 'Não há documentos que correspondam aos filtros aplicados. Tente ajustar os filtros ou limpar para ver todos.'
                  : 'Você ainda não enviou nenhum documento. Clique no botão "Novo Documento" para começar.'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={handleClearFilters} className="mt-4">
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            // Tabela com documentos
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Tipo de Documento</TableHead>
                    <TableHead className="w-[25%]">Arquivo</TableHead>
                    <TableHead className="w-[12%]">Data de Emissão</TableHead>
                    <TableHead className="w-[12%]">Data de Validade</TableHead>
                    <TableHead className="w-[11%]">Status</TableHead>
                    <TableHead className="w-[10%] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((document) => (
                    <TableRow key={document.id}>
                      {/* Tipo de Documento */}
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{getDocumentTypeLabel(document.type)}</span>
                        </div>
                      </TableCell>

                      {/* Nome do Arquivo */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm truncate max-w-[200px]" title={document.fileName}>
                            {document.fileName}
                          </span>
                          {document.fileSize && (
                            <span className="text-xs text-muted-foreground">
                              {(document.fileSize / 1024 / 1024).toFixed(2)} MB
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Data de Emissão */}
                      <TableCell>
                        <span className="text-sm">{formatDate(document.issuedAt)}</span>
                      </TableCell>

                      {/* Data de Validade */}
                      <TableCell>
                        <span className="text-sm">{formatDate(document.expiresAt)}</span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge variant={statusBadgeVariants[document.status]}>
                          {statusLabels[document.status]}
                        </Badge>
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => handleDownload(document)}
                              className="cursor-pointer"
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                              <Edit className="mr-2 h-4 w-4" />
                              Editar metadados
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(document)}
                              className="cursor-pointer text-danger focus:text-danger"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Contador de documentos */}
          {filteredDocuments && filteredDocuments.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground text-center">
              Exibindo {filteredDocuments.length} documento(s)
              {hasActiveFilters && documents && documents.length !== filteredDocuments.length && (
                <span> de {documents.length} no total</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AlertDialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-danger" />
              Confirmar exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Tem certeza que deseja excluir o documento{' '}
                <span className="font-semibold">
                  {documentToDelete && getDocumentTypeLabel(documentToDelete.type)}
                </span>
                ?
              </p>
              <p className="text-xs">
                Arquivo: <span className="font-medium">{documentToDelete?.fileName}</span>
              </p>
              <p className="text-danger text-sm font-medium mt-3">
                Esta ação não pode ser desfeita. O arquivo será permanentemente removido do armazenamento.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-danger hover:bg-danger/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir documento
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Upload */}
      <DocumentUploadModal open={uploadModalOpen} onOpenChange={setUploadModalOpen} />
    </div>
  )
}
