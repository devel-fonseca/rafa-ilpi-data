import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Rocket, Trash2, Copy, Check } from 'lucide-react'
import { useContract, useDeleteContract, useContractAcceptances } from '@/hooks/useContracts'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PublishContractDialog } from '@/components/superadmin/PublishContractDialog'
import { toast } from 'sonner'

const statusColors = {
  DRAFT: 'bg-muted/20 text-foreground/90',
  ACTIVE: 'bg-success/10 text-success/90',
  REVOKED: 'bg-danger/10 text-danger/90',
}

const statusLabels = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativo',
  REVOKED: 'Revogado',
}

export function ContractDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: contract, isLoading } = useContract(id!)
  const { data: acceptances, isLoading: loadingAcceptances } = useContractAcceptances(id!)
  const deleteContract = useDeleteContract()

  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [copiedHash, setCopiedHash] = useState(false)

  const handleDelete = async () => {
    if (!contract || !confirm('Tem certeza que deseja deletar este contrato?')) return

    await deleteContract.mutateAsync(contract.id)
    navigate('/superadmin/contracts')
  }

  const handleCopyHash = async () => {
    if (!contract) return

    try {
      await navigator.clipboard.writeText(contract.contentHash)
      setCopiedHash(true)
      toast.success('Hash copiado para área de transferência')
      setTimeout(() => setCopiedHash(false), 2000)
    } catch (error) {
      toast.error('Erro ao copiar hash')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Contrato não encontrado</p>
      </div>
    )
  }

  const isDraft = contract.status === 'DRAFT'
  const isActive = contract.status === 'ACTIVE'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate('/superadmin/contracts')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{contract.title}</h1>
            <p className="text-muted-foreground">Versão {contract.version}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {isDraft && (
            <>
              <Button variant="outline" onClick={() => navigate(`/superadmin/contracts/${id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="outline"
                className="text-success border-success/60 hover:bg-success/5"
                onClick={() => setPublishDialogOpen(true)}
              >
                <Rocket className="h-4 w-4 mr-2" />
                Publicar
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Status</p>
          <Badge className={`${statusColors[contract.status]} mt-1`}>
            {statusLabels[contract.status]}
          </Badge>
        </Card>

        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Plano</p>
          <p className="font-semibold mt-1">
            {contract.plan ? contract.plan.displayName : 'Genérico'}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Aceites</p>
          <p className="font-semibold mt-1">{contract._count?.acceptances || 0}</p>
        </Card>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="acceptances">
            Aceites ({contract._count?.acceptances || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card className="p-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Criado por</p>
                <p className="font-medium">{contract.creator?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Criado em</p>
                <p className="font-medium">{new Date(contract.createdAt).toLocaleString('pt-BR')}</p>
              </div>
              {isActive && contract.effectiveFrom && (
                <div>
                  <p className="text-muted-foreground">Publicado em</p>
                  <p className="font-medium">
                    {new Date(contract.effectiveFrom).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-muted-foreground mb-2">Hash SHA-256</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-xs bg-muted p-2 rounded break-all">
                    {contract.contentHash}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyHash}
                    title="Copiar hash"
                  >
                    {copiedHash ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <Card className="p-6">
            <div
              className="prose max-w-none bg-white p-6 rounded border"
              dangerouslySetInnerHTML={{ __html: contract.content }}
            />
          </Card>
        </TabsContent>

        <TabsContent value="acceptances" className="mt-4">
          <Card className="p-6">
            {loadingAcceptances ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando aceites...</p>
              </div>
            ) : acceptances && acceptances.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Tenant</th>
                      <th className="text-left py-2">Usuário</th>
                      <th className="text-left py-2">Data</th>
                      <th className="text-left py-2">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acceptances.map((acceptance) => (
                      <tr key={acceptance.id} className="border-b">
                        <td className="py-2">{acceptance.tenant?.name || '-'}</td>
                        <td className="py-2">{acceptance.user?.name || '-'}</td>
                        <td className="py-2">
                          {new Date(acceptance.acceptedAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-2 font-mono text-xs">{acceptance.ipAddress}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Nenhum aceite registrado para este contrato
                </p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <PublishContractDialog
        contract={contract}
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
      />
    </div>
  )
}
