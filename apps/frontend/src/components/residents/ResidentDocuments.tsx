import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Upload,
  Eye,
  Trash2,
  Loader2,
  Search,
  FileIcon,
  X,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/utils/formatters'
import { RESIDENT_DOCUMENT_TYPES } from '@/api/resident-documents.api'
import {
  useResidentDocuments,
  useUploadResidentDocument,
  useDeleteResidentDocument,
  useUpdateResidentDocumentMetadata,
} from '@/hooks/useResidentDocuments'

interface ResidentDocumentsProps {
  residentId: string
}

export function ResidentDocuments({ residentId }: ResidentDocumentsProps) {
  // Estados
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('ALL')
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadType, setUploadType] = useState('')
  const [uploadDetails, setUploadDetails] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Hooks
  const {
    data: documents = [],
    isLoading,
    error,
  } = useResidentDocuments(residentId, filterType === 'ALL' ? undefined : filterType)

  const uploadMutation = useUploadResidentDocument(residentId)
  const deleteMutation = useDeleteResidentDocument(residentId)

  // Filtrar documentos por busca
  const filteredDocuments = documents.filter((doc) => {
    const searchLower = searchTerm.toLowerCase()
    const typeLabel =
      RESIDENT_DOCUMENT_TYPES.find((t) => t.value === doc.type)?.label || doc.type
    const matchesSearch =
      doc.fileName.toLowerCase().includes(searchLower) ||
      typeLabel.toLowerCase().includes(searchLower) ||
      (doc.details && doc.details.toLowerCase().includes(searchLower))

    return matchesSearch
  })

  // Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tamanho (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Arquivo deve ter no máximo 10MB')
        return
      }

      // Validar tipo
      const validTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
      ]
      if (!validTypes.includes(file.type)) {
        toast.error('Tipo de arquivo não permitido. Use PDF, JPG, PNG ou WEBP')
        return
      }

      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !uploadType) {
      toast.error('Selecione um arquivo e o tipo de documento')
      return
    }

    try {
      await uploadMutation.mutateAsync({
        file: selectedFile,
        metadata: {
          type: uploadType,
          details: uploadDetails || undefined,
        },
      })

      toast.success('Documento enviado com sucesso!')
      setIsUploadDialogOpen(false)
      setSelectedFile(null)
      setUploadType('')
      setUploadDetails('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao enviar documento')
    }
  }

  const handleDelete = async (documentId: string, fileName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o documento "${fileName}"?`)) {
      return
    }

    try {
      await deleteMutation.mutateAsync(documentId)
      toast.success('Documento excluído com sucesso!')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao excluir documento')
    }
  }

  const handleView = async (fileUrl: string) => {
    try {
      // Se já é uma URL completa (http/https), abrir diretamente
      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        window.open(fileUrl, '_blank')
        return
      }

      // Caso contrário, obter URL assinada do MinIO
      const { getSignedFileUrl } = await import('@/services/upload')
      const signedUrl = await getSignedFileUrl(fileUrl)
      window.open(signedUrl, '_blank')
    } catch (error) {
      console.error('Erro ao abrir documento:', error)
      toast.error('Erro ao abrir documento')
    }
  }

  const getTypeLabel = (type: string) => {
    return RESIDENT_DOCUMENT_TYPES.find((t) => t.value === type)?.label || type
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Documentos</CardTitle>
              <CardDescription>
                Gerencie todos os documentos do cadastro do residente
              </CardDescription>
            </div>
            <Button type="button" onClick={() => setIsUploadDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Documento
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Busca */}
            <div className="md:col-span-1">
              <Label htmlFor="search">Busca</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
                <Input
                  id="search"
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Tipo de Documento */}
            <div className="md:col-span-1">
              <Label htmlFor="document-filter-type">Tipo de Documento</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger id="document-filter-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os tipos</SelectItem>
                  {RESIDENT_DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Detalhes (vazio, apenas para layout) */}
            <div className="md:col-span-1">
              <Label>Detalhes</Label>
              <div className="h-10" /> {/* Espaçamento */}
            </div>
          </div>

          {/* Tabela de Documentos */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-danger">
              Erro ao carregar documentos. Tente novamente.
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium">Nenhum documento encontrado</p>
              <p className="text-sm mt-2">
                {documents.length === 0
                  ? 'Clique em "Novo Documento" para adicionar o primeiro documento'
                  : 'Tente ajustar os filtros de busca'}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">
                        {formatDate(doc.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileIcon className="h-4 w-4 text-muted-foreground/70" />
                          <div>
                            <div className="font-medium">{getTypeLabel(doc.type)}</div>
                            <div className="text-xs text-muted-foreground">{doc.fileName}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {doc.details ? (
                          <span className="text-sm">{doc.details}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground/70">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(doc.fileUrl)}
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {doc.type !== 'PRESCRICAO_MEDICA' && doc.type !== 'COMPROVANTE_VACINACAO' && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(doc.id, doc.fileName)}
                              disabled={deleteMutation.isPending}
                              title="Excluir"
                              className="text-danger hover:text-danger/80 hover:bg-danger/5"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Upload */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Documento</DialogTitle>
            <DialogDescription>
              Faça upload de um documento do residente (máximo 10MB)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Tipo de Documento */}
            <div>
              <Label htmlFor="document-upload-type">
                Tipo de Documento <span className="text-danger">*</span>
              </Label>
              <Select value={uploadType} onValueChange={setUploadType}>
                <SelectTrigger id="document-upload-type">
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {RESIDENT_DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Detalhes */}
            <div>
              <Label htmlFor="document-upload-details">Detalhes (opcional)</Label>
              <Input
                id="document-upload-details"
                placeholder="Ex: Unimed, Laudo de entrada, etc."
                value={uploadDetails}
                onChange={(e) => setUploadDetails(e.target.value)}
              />
            </div>

            {/* Arquivo */}
            <div>
              <Label htmlFor="document-upload-file">
                Arquivo <span className="text-danger">*</span>
              </Label>
              <div className="mt-2">
                {selectedFile ? (
                  <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                    <FileIcon className="h-5 w-5 text-muted-foreground/70 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null)
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar Arquivo
                  </Button>
                )}
                <input
                  id="document-upload-file"
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Formatos aceitos: PDF, JPG, PNG, WEBP (máx. 10MB)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsUploadDialogOpen(false)
                setSelectedFile(null)
                setUploadType('')
                setUploadDetails('')
                if (fileInputRef.current) {
                  fileInputRef.current.value = ''
                }
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || !uploadType || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
