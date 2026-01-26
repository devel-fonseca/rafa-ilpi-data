import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useContract, useUpdateContract } from '@/hooks/useContracts'

export function ContractEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: contract, isLoading } = useContract(id!)
  const updateContract = useUpdateContract()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    if (contract) {
      setTitle(contract.title)
      setContent(contract.content)
    }
  }, [contract])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await updateContract.mutateAsync({
        id: id!,
        dto: { title, content },
      })

      navigate(`/superadmin/contracts/${id}`)
    } catch (error) {
      // Erro já tratado pelo hook
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Termo de uso não encontrado</p>
      </div>
    )
  }

  if (contract.status !== 'DRAFT') {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(`/superadmin/contracts/${id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Editar Termo de Uso</h1>
        </div>

        <Alert variant="destructive">
          <AlertDescription>
            Apenas termos de uso com status DRAFT podem ser editados. Este termo de uso está como{' '}
            <strong>{contract.status}</strong>.
          </AlertDescription>
        </Alert>

        <Button onClick={() => navigate(`/superadmin/contracts/${id}`)}>
          Voltar para Detalhes
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(`/superadmin/contracts/${id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Editar Termo de Uso</h1>
            <p className="text-muted-foreground">
              Versão {contract.version} • Apenas título e conteúdo podem ser editados
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Informações Básicas</h3>

          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Versão (não editável)</Label>
              <div className="bg-muted p-3 rounded text-sm font-medium mt-1">
                {contract.version}
              </div>
            </div>

            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contrato de Prestação de Serviços"
                required
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-lg mb-3">Conteúdo do Termo de Uso</h3>
            <Card className="p-4 bg-primary/5 border-primary/30">
              <p className="text-xs font-semibold text-primary/95 mb-2">
                📝 Variáveis disponíveis para usar no termo de uso:
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-primary/90">
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{tenant.name}}'}</code> - Nome do tenant</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{tenant.cnpj}}'}</code> - CNPJ do tenant</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{tenant.email}}'}</code> - Email do tenant</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{user.name}}'}</code> - Nome do responsável</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{user.cpf}}'}</code> - CPF do responsável</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{user.email}}'}</code> - Email do responsável</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{plan.name}}'}</code> - Nome técnico do plano</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{plan.displayName}}'}</code> - Nome de exibição do plano</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{plan.price}}'}</code> - Preço do plano</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{plan.maxUsers}}'}</code> - Máximo de usuários</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{plan.maxResidents}}'}</code> - Máximo de residentes</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{trial.days}}'}</code> - Dias de trial</div>
                <div><code className="bg-white px-1.5 py-0.5 rounded">{'{{today}}'}</code> - Data de hoje</div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label htmlFor="content" className="text-sm font-medium mb-2 block">
                Editor HTML
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="<h1>Contrato</h1><p>{{tenant.name}}</p>"
                className="font-mono text-sm h-[600px] resize-none"
                required
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Preview ao vivo</Label>
              <div className="border rounded h-[600px] p-6 bg-white overflow-auto">
                {content ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm text-center mt-8">
                    Digite o HTML à esquerda para ver o preview
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/superadmin/contracts/${id}`)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={updateContract.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateContract.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </div>
  )
}
