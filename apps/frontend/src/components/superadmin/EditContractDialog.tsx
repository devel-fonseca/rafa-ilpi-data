import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { useUpdateContract } from '@/hooks/useContracts'
import type { Contract } from '@/api/contracts.api'

interface EditContractDialogProps {
  contract: Contract | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditContractDialog({
  contract,
  open,
  onOpenChange,
}: EditContractDialogProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const updateContract = useUpdateContract()

  useEffect(() => {
    if (contract) {
      setTitle(contract.title)
      setContent(contract.content)
    }
  }, [contract])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contract) return

    await updateContract.mutateAsync({
      id: contract.id,
      dto: {
        title,
        content,
      },
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Contrato (DRAFT)</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-primary/5 p-3 rounded text-sm text-primary/90">
            <strong>Versão:</strong> {contract?.version} (não editável)
          </div>

          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Conteúdo (HTML) *</Label>
            <Card className="mt-2 p-3 bg-primary/5 border-primary/30">
              <p className="text-xs font-semibold text-primary/95 mb-2">
                📝 Variáveis disponíveis:
                <code className="ml-2 bg-white px-1 rounded">{'{{tenant.name}}'}</code>
                <code className="ml-1 bg-white px-1 rounded">{'{{tenant.cnpj}}'}</code>
                <code className="ml-1 bg-white px-1 rounded">{'{{tenant.email}}'}</code>
                <code className="ml-1 bg-white px-1 rounded">{'{{plan.displayName}}'}</code>
                <code className="ml-1 bg-white px-1 rounded">{'{{plan.price}}'}</code>
                <code className="ml-1 bg-white px-1 rounded">{'{{today}}'}</code>
              </p>
            </Card>

            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <Label htmlFor="content" className="text-xs text-muted-foreground">Editor HTML</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="font-mono text-sm min-h-[400px] mt-1"
                  required
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Preview ao vivo</Label>
                <div className="border rounded min-h-[400px] mt-1 p-4 bg-white overflow-auto">
                  {content ? (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: content }}
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Digite o HTML à esquerda para ver o preview
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateContract.isPending}>
              {updateContract.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
