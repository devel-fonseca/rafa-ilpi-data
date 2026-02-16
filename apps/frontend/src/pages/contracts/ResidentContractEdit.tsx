import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { getContractDetails, updateContract } from '@/services/residentContractsApi'
import { tenantKey } from '@/lib/query-keys'
import { Page, PageHeader } from '@/design-system/components'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AlertCircle, Loader2, CircleHelp } from 'lucide-react'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { toast } from 'sonner'

export default function ResidentContractEdit() {
  const navigate = useNavigate()
  const { residentId, contractId } = useParams()
  const { hasPermission } = usePermissions()
  const canUpdateContracts = hasPermission(PermissionType.UPDATE_CONTRACTS)

  const [contractNumber, setContractNumber] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isIndefinite, setIsIndefinite] = useState(false)
  const [monthlyAmount, setMonthlyAmount] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [lateFeePercent, setLateFeePercent] = useState('')
  const [interestMonthlyPercent, setInterestMonthlyPercent] = useState('')
  const [adjustmentIndex, setAdjustmentIndex] = useState('')
  const [adjustmentRate, setAdjustmentRate] = useState('')
  const [lastAdjustmentDate, setLastAdjustmentDate] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const parsePtBrNumber = (raw: string): number => {
    const normalized = raw.replace(/\./g, '').replace(',', '.').trim()
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : NaN
  }

  const parseFlexibleDecimal = (raw: string): number => {
    const normalized = raw.replace(/\./g, '').replace(',', '.').trim()
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : NaN
  }

  const formatPtBrNumber = (value: number): string =>
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)

  const { data: contract, isLoading, error } = useQuery({
    queryKey: tenantKey('resident-contracts', residentId, contractId),
    queryFn: () => getContractDetails(residentId!, contractId!),
    enabled: !!residentId && !!contractId && canUpdateContracts,
  })

  useEffect(() => {
    if (!contract) return
    setContractNumber(contract.contractNumber || '')
    setStartDate(contract.startDate?.slice(0, 10) || '')
    setEndDate(contract.endDate ? contract.endDate.slice(0, 10) : '')
    setIsIndefinite(contract.isIndefinite === true)
    setMonthlyAmount(formatPtBrNumber(Number(contract.monthlyAmount ?? 0)))
    setDueDay(String(contract.dueDay ?? ''))
    setLateFeePercent(String(contract.lateFeePercent ?? 0))
    setInterestMonthlyPercent(String(contract.interestMonthlyPercent ?? 0))
    setAdjustmentIndex(contract.adjustmentIndex || '')
    setAdjustmentRate(contract.adjustmentRate !== undefined && contract.adjustmentRate !== null ? String(contract.adjustmentRate) : '')
    setLastAdjustmentDate(contract.lastAdjustmentDate ? contract.lastAdjustmentDate.slice(0, 10) : '')
    setNotes(contract.notes || '')
  }, [contract])

  const updateMutation = useMutation({
    mutationFn: () =>
      updateContract(residentId!, contractId!, {
        contractNumber: contractNumber.trim(),
        startDate,
        endDate: isIndefinite ? undefined : endDate,
        isIndefinite,
        monthlyAmount: parsePtBrNumber(monthlyAmount),
        dueDay: Number(dueDay),
        lateFeePercent: Number(lateFeePercent || 0),
        interestMonthlyPercent: Number(interestMonthlyPercent || 0),
        adjustmentIndex: adjustmentIndex || undefined,
        adjustmentRate: adjustmentRate ? parseFlexibleDecimal(adjustmentRate) : undefined,
        lastAdjustmentDate: lastAdjustmentDate || undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Contrato atualizado com sucesso')
      navigate(`/dashboard/contratos/${residentId}/${contractId}`)
    },
    onError: () => {
      toast.error('Erro ao atualizar contrato')
    },
  })

  const validate = () => {
    const newErrors: Record<string, string> = {}
    const monthlyAmountNumber = parsePtBrNumber(monthlyAmount)
    const dueDayNumber = Number(dueDay)
    const lateFeeNumber = lateFeePercent ? Number(lateFeePercent) : 0
    const interestNumber = interestMonthlyPercent ? Number(interestMonthlyPercent) : 0
    const adjustmentRateNumber = adjustmentRate ? parseFlexibleDecimal(adjustmentRate) : 0

    if (!contractNumber.trim()) newErrors.contractNumber = 'Número do contrato é obrigatório'
    if (!startDate) newErrors.startDate = 'Data de início é obrigatória'
    if (!isIndefinite && !endDate) newErrors.endDate = 'Data de fim é obrigatória'

    if (!isIndefinite && startDate && endDate && endDate < startDate) {
      newErrors.endDate = 'Data de fim não pode ser anterior à data de início'
    }

    if (!monthlyAmount || Number.isNaN(monthlyAmountNumber) || monthlyAmountNumber <= 0) {
      newErrors.monthlyAmount = 'Valor deve ser maior que zero'
    }

    if (!dueDay || Number.isNaN(dueDayNumber) || dueDayNumber < 1 || dueDayNumber > 28) {
      newErrors.dueDay = 'Dia deve estar entre 1 e 28'
    }

    if (Number.isNaN(lateFeeNumber) || lateFeeNumber < 0 || lateFeeNumber > 100) {
      newErrors.lateFeePercent = 'Multa deve estar entre 0 e 100%'
    }

    if (Number.isNaN(interestNumber) || interestNumber < 0 || interestNumber > 100) {
      newErrors.interestMonthlyPercent = 'Juros deve estar entre 0 e 100%'
    }

    if (adjustmentRate && (Number.isNaN(adjustmentRateNumber) || adjustmentRateNumber < 0 || adjustmentRateNumber > 100)) {
      newErrors.adjustmentRate = 'Taxa de reajuste deve estar entre 0 e 100%'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (contract?.status === 'RESCINDIDO') {
      toast.error('Contrato rescindido não pode ser editado')
      return
    }
    if (!validate()) return
    updateMutation.mutate()
  }

  if (!canUpdateContracts) {
    return (
      <Page maxWidth="default">
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <AlertCircle className="h-16 w-16 text-destructive" />
          <div className="text-2xl font-semibold">Acesso Negado</div>
          <div className="text-muted-foreground text-center max-w-md">
            Você não tem permissão para editar contratos.
          </div>
        </div>
      </Page>
    )
  }

  if (isLoading) {
    return (
      <Page maxWidth="default">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Page>
    )
  }

  if (error || !contract) {
    return (
      <Page maxWidth="default">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <AlertCircle className="h-12 w-12 text-danger" />
          <div className="text-muted-foreground">Contrato não encontrado</div>
          <Button variant="outline" onClick={() => navigate('/dashboard/contratos')}>
            Voltar para a lista
          </Button>
        </div>
      </Page>
    )
  }

  return (
    <Page maxWidth="default">
      <PageHeader
        title={`Editar Contrato ${contract.contractNumber}`}
        subtitle={`Residente: ${contract.resident?.fullName || 'Não informado'}`}
        backButton={{ onClick: () => navigate(`/dashboard/contratos/${residentId}/${contractId}`) }}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {contract.status === 'RESCINDIDO' && (
          <Card className="border-danger">
            <CardContent className="pt-6">
              <p className="text-sm text-danger">
                Este contrato está rescindido e não pode ser editado.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Dados do Contrato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contractNumber">Número do Contrato *</Label>
                <Input
                  id="contractNumber"
                  value={contractNumber}
                  onChange={(e) => setContractNumber(e.target.value)}
                  className={errors.contractNumber ? 'border-danger' : ''}
                />
                {errors.contractNumber && <p className="text-sm text-danger">{errors.contractNumber}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyAmount">Valor da Mensalidade (R$) *</Label>
                <Input
                  id="monthlyAmount"
                  inputMode="decimal"
                  value={monthlyAmount}
                  onChange={(e) => {
                    const next = e.target.value.replace(/[^\d,.-]/g, '').replace(/\./g, ',')
                    setMonthlyAmount(next)
                  }}
                  onBlur={() => {
                    const parsed = parsePtBrNumber(monthlyAmount)
                    if (!Number.isNaN(parsed) && parsed >= 0) {
                      setMonthlyAmount(formatPtBrNumber(parsed))
                    }
                  }}
                  className={errors.monthlyAmount ? 'border-danger' : ''}
                />
                {errors.monthlyAmount && <p className="text-sm text-danger">{errors.monthlyAmount}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data de Início *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={errors.startDate ? 'border-danger' : ''}
                />
                {errors.startDate && <p className="text-sm text-danger">{errors.startDate}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data de Fim {isIndefinite ? '(opcional)' : '*'}</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isIndefinite}
                  className={errors.endDate ? 'border-danger' : ''}
                />
                {errors.endDate && <p className="text-sm text-danger">{errors.endDate}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-md border p-3">
              <Checkbox
                id="isIndefinite"
                checked={isIndefinite}
                onCheckedChange={(checked) => {
                  const next = checked === true
                  setIsIndefinite(next)
                  if (next) setEndDate('')
                }}
              />
              <Label htmlFor="isIndefinite" className="cursor-pointer">
                Contrato por prazo indeterminado
              </Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDay">Dia de Vencimento *</Label>
                <Input
                  id="dueDay"
                  type="number"
                  min="1"
                  max="28"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  className={errors.dueDay ? 'border-danger' : ''}
                />
                {errors.dueDay && <p className="text-sm text-danger">{errors.dueDay}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lateFeePercent">Multa por atraso (%)</Label>
                <Input
                  id="lateFeePercent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={lateFeePercent}
                  onChange={(e) => setLateFeePercent(e.target.value)}
                />
                {errors.lateFeePercent && <p className="text-sm text-danger">{errors.lateFeePercent}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="interestMonthlyPercent">Juros por atraso (% ao mês)</Label>
                <Input
                  id="interestMonthlyPercent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={interestMonthlyPercent}
                  onChange={(e) => setInterestMonthlyPercent(e.target.value)}
                />
                {errors.interestMonthlyPercent && <p className="text-sm text-danger">{errors.interestMonthlyPercent}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reajuste e Observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adjustmentIndex">Índice de Reajuste</Label>
                <Input id="adjustmentIndex" value={adjustmentIndex} onChange={(e) => setAdjustmentIndex(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjustmentRate" className="flex items-center gap-1">
                  <span>Taxa (%)</span>
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground">
                          <CircleHelp className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Acumulado 12 meses</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="adjustmentRate"
                  type="text"
                  inputMode="decimal"
                  value={adjustmentRate}
                  onChange={(e) =>
                    setAdjustmentRate(
                      e.target.value
                        .replace(/[^\d,.-]/g, '')
                        .replace(/\./g, ',')
                    )
                  }
                  placeholder="Ex: 5,31964"
                />
                {errors.adjustmentRate && <p className="text-sm text-danger">{errors.adjustmentRate}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastAdjustmentDate">Data do Último Reajuste</Label>
                <Input id="lastAdjustmentDate" type="date" value={lastAdjustmentDate} onChange={(e) => setLastAdjustmentDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/dashboard/contratos/${residentId}/${contractId}`)}
            disabled={updateMutation.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={updateMutation.isPending || contract.status === 'RESCINDIDO'}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </div>
      </form>
    </Page>
  )
}
