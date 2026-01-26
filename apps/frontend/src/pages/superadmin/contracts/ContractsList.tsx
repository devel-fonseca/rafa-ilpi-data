import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import { useTermsOfService } from '@/hooks/useTermsOfService'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TermsOfService } from '@/api/terms-of-service.api'

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

export function ContractsList() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filters = statusFilter === 'all' ? {} : { status: statusFilter as 'DRAFT' | 'ACTIVE' | 'REVOKED' }
  const { data: contracts, isLoading } = useTermsOfService(filters)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Termos de Uso</h1>
          <p className="text-muted-foreground">
            Gerencie os termos de uso da plataforma
          </p>
        </div>
        <Button onClick={() => navigate('/superadmin/terms/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Termo de Uso
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium">Filtrar por status:</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px] mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="DRAFT">Rascunho</SelectItem>
                <SelectItem value="ACTIVE">Ativo</SelectItem>
                <SelectItem value="REVOKED">Revogado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : contracts && contracts.length > 0 ? (
        <div className="grid gap-4">
          {contracts.map((contract: TermsOfService) => (
            <Link key={contract.id} to={`/superadmin/terms/${contract.id}`}>
              <Card className="p-6 hover:bg-accent transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <FileText className="h-10 w-10 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{contract.title}</h3>
                        <Badge className={statusColors[contract.status]}>
                          {statusLabels[contract.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Versão {contract.version}
                        {contract.plan && ` • ${contract.plan.displayName}`}
                        {!contract.plan && ' • Genérico (todos os planos)'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {contract._count?.acceptances || 0} aceite(s) •
                        Criado em {new Date(contract.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum termo de uso encontrado</h3>
          <p className="text-muted-foreground mb-4">
            Crie um novo termo de uso para começar
          </p>
          <Button onClick={() => navigate('/superadmin/terms/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Termo de Uso
          </Button>
        </Card>
      )}
    </div>
  )
}
