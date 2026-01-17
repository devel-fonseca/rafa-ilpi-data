import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { uploadContract, type CreateContractDto } from '@/services/residentContractsApi'
import type { Resident } from '@/api/residents.api'
import { api } from '@/services/api'
import { tenantKey } from '@/lib/query-keys'
import { Page, PageHeader } from '@/design-system/components'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, AlertCircle, Upload, FileText, X } from 'lucide-react'
import { toast } from 'sonner'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { ContractualResponsiblesManager } from './components/ContractualResponsiblesManager'

export default function ResidentContractUpload() {
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [residentId, setResidentId] = useState<string>('')
  const [contractNumber, setContractNumber] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [monthlyAmount, setMonthlyAmount] = useState('')
  const [dueDay, setDueDay] = useState('10')
  const [adjustmentIndex, setAdjustmentIndex] = useState('')
  const [adjustmentRate, setAdjustmentRate] = useState('')
  const [lastAdjustmentDate, setLastAdjustmentDate] = useState('')
  const [notes, setNotes] = useState('')

  const [contractualResponsibles, setContractualResponsibles] = useState<Array<{ name: string; cpf: string; role: 'RESPONSAVEL_CONTRATUAL' }>>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Verificar permissão
  const canCreateContracts = hasPermission(PermissionType.CREATE_CONTRACTS)

  // Buscar lista de residentes (sem filtro de status - retorna todos)
  const { data: residentsData, isLoading: isLoadingResidents, error: residentsError } = useQuery({
    queryKey: tenantKey('residents'),
    queryFn: async () => {
      const response = await api.get('/residents')
      return response.data
    },
  })

  const residents = residentsData?.data || []

  // Mutation para upload
  const uploadMutation = useMutation({
    mutationFn: ({ residentId, file, data }: { residentId: string; file: File; data: CreateContractDto }) =>
      uploadContract(residentId, file, data),
    onSuccess: (data) => {
      toast.success('Contrato cadastrado com sucesso! Arquivo processado automaticamente.')
      navigate(`/dashboard/contratos/${data.residentId}/${data.id}`)
    },
    onError: () => {
      toast.error('Erro ao cadastrar contrato')
    },
  })

  // Handler de seleção de arquivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validar tamanho (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('Arquivo deve ter no máximo 10MB')
      return
    }

    // Validar tipo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Formato inválido. Use JPG, PNG, WEBP ou PDF')
      return
    }

    setFile(selectedFile)

    // Preview para imagens
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string)
      }
      reader.readAsDataURL(selectedFile)
    } else {
      setFilePreview(null)
    }
  }

  // Remover arquivo
  const handleRemoveFile = () => {
    setFile(null)
    setFilePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Validação
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!residentId) newErrors.residentId = 'Selecione um residente'
    if (!contractNumber) newErrors.contractNumber = 'Informe o número do contrato'
    if (!startDate) newErrors.startDate = 'Informe a data de início'
    if (!endDate) newErrors.endDate = 'Informe a data de fim'
    if (!monthlyAmount) newErrors.monthlyAmount = 'Informe o valor mensal'
    if (!dueDay) newErrors.dueDay = 'Informe o dia de vencimento'
    if (!file) newErrors.file = 'Selecione o arquivo do contrato'

    // Validar responsável contratual (se preenchido, ambos os campos são obrigatórios)
    // Validar responsáveis contratuais (se houver algum, todos devem ter nome e CPF)
    contractualResponsibles.forEach((resp, index) => {
      if (!resp.name.trim()) {
        newErrors['responsible-' + index + '-name'] = 'Nome obrigatório'
      }
      if (!resp.cpf.trim()) {
        newErrors['responsible-' + index + '-cpf'] = 'CPF obrigatório'
      }
    })

    // Validar valor
    if (monthlyAmount && Number(monthlyAmount) <= 0) {
      newErrors.monthlyAmount = 'Valor deve ser maior que zero'
    }

    // Validar dia de vencimento
    if (dueDay && (Number(dueDay) < 1 || Number(dueDay) > 28)) {
      newErrors.dueDay = 'Dia de vencimento deve estar entre 1 e 28'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (!file || !residentId) return

    // Backend adiciona automaticamente ILPI + RESIDENTE
    // Frontend envia apenas responsáveis contratuais

    const data: CreateContractDto = {
      contractNumber,
      startDate,
      endDate,
      monthlyAmount: Number(monthlyAmount),
      dueDay: Number(dueDay),
      signatories: contractualResponsibles,
      adjustmentIndex: adjustmentIndex || undefined,
      adjustmentRate: adjustmentRate ? Number(adjustmentRate) : undefined,
      lastAdjustmentDate: lastAdjustmentDate || undefined,
      notes: notes || undefined,
    }

    uploadMutation.mutate({ residentId, file, data })
  }

  if (!canCreateContracts) {
    return (
      <Page maxWidth="default">
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <AlertCircle className="h-16 w-16 text-destructive" />
          <div className="text-2xl font-semibold">Acesso Negado</div>
          <div className="text-muted-foreground text-center max-w-md">
            Você não tem permissão para cadastrar contratos.
          </div>
        </div>
      </Page>
    )
  }

  return (
    <Page maxWidth="default">
      <PageHeader
        title="Novo Contrato de Prestação de Serviços"
        subtitle="Digitalize e cadastre um novo contrato físico"
        backButton={{ onClick: () => navigate('/dashboard/contratos') }}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Upload do Arquivo */}
        <Card>
          <CardHeader>
            <CardTitle>Documento do Contrato</CardTitle>
            <CardDescription>
              Faça upload do contrato físico (foto ou PDF). O backend processará automaticamente adicionando
              carimbo institucional com hash SHA-256 para validação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!file ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors"
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">Clique para selecionar o arquivo</p>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, WEBP ou PDF (máx. 10MB)
                  </p>
                </div>
              ) : (
                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {filePreview ? (
                        <img src={filePreview} alt="Preview" className="h-20 w-20 object-cover rounded" />
                      ) : (
                        <FileText className="h-20 w-20 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ⚙️ Será processado automaticamente pelo backend
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleRemoveFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              {errors.file && <p className="text-sm text-danger">{errors.file}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Dados Básicos */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Contrato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="residentId">Residente *</Label>
                <Select value={residentId} onValueChange={setResidentId} disabled={isLoadingResidents}>
                  <SelectTrigger className={errors.residentId ? 'border-danger' : ''}>
                    <SelectValue
                      placeholder={
                        isLoadingResidents
                          ? 'Carregando residentes...'
                          : residentsError
                          ? 'Erro ao carregar residentes'
                          : residents.length === 0
                          ? 'Nenhum residente ativo encontrado'
                          : 'Selecione o residente'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {residents.length === 0 && !isLoadingResidents && (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Nenhum residente ativo encontrado
                      </div>
                    )}
                    {residents.map((resident: Resident) => (
                      <SelectItem key={resident.id} value={resident.id}>
                        {resident.fullName} {resident.cpf && `(CPF: ${resident.cpf})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.residentId && <p className="text-sm text-danger">{errors.residentId}</p>}
                {residentsError && (
                  <p className="text-sm text-severity-warning">
                    Erro ao carregar residentes. Verifique sua conexão.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractNumber">Número do Contrato *</Label>
                <Input
                  id="contractNumber"
                  value={contractNumber}
                  onChange={(e) => setContractNumber(e.target.value)}
                  placeholder="Ex: CONT-2025-001"
                  className={errors.contractNumber ? 'border-danger' : ''}
                />
                {errors.contractNumber && <p className="text-sm text-danger">{errors.contractNumber}</p>}
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
                <Label htmlFor="endDate">Data de Fim *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={errors.endDate ? 'border-danger' : ''}
                />
                {errors.endDate && <p className="text-sm text-danger">{errors.endDate}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyAmount">Valor da Mensalidade (R$) *</Label>
                <Input
                  id="monthlyAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(e.target.value)}
                  placeholder="Ex: 3500.00"
                  className={errors.monthlyAmount ? 'border-danger' : ''}
                />
                {errors.monthlyAmount && <p className="text-sm text-danger">{errors.monthlyAmount}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDay">Dia de Vencimento (1-28) *</Label>
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
            </div>
          </CardContent>
        </Card>

        {/* Reajuste (opcional) */}
        <Card>
          <CardHeader>
            <CardTitle>Reajuste (Opcional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adjustmentIndex">Índice de Reajuste</Label>
                <Input
                  id="adjustmentIndex"
                  value={adjustmentIndex}
                  onChange={(e) => setAdjustmentIndex(e.target.value)}
                  placeholder="Ex: INPC, IGP-M"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adjustmentRate">Taxa do Último Reajuste (%)</Label>
                <Input
                  id="adjustmentRate"
                  type="number"
                  step="0.01"
                  value={adjustmentRate}
                  onChange={(e) => setAdjustmentRate(e.target.value)}
                  placeholder="Ex: 5.5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastAdjustmentDate">Data do Último Reajuste</Label>
                <Input
                  id="lastAdjustmentDate"
                  type="date"
                  value={lastAdjustmentDate}
                  onChange={(e) => setLastAdjustmentDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Responsáveis Contratuais */}
        <ContractualResponsiblesManager
          responsibles={contractualResponsibles}
          onChange={setContractualResponsibles}
          errors={errors}
        />

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle>Observações (Opcional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações adicionais sobre o contrato..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/contratos')}
            disabled={uploadMutation.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              'Cadastrar Contrato'
            )}
          </Button>
        </div>
      </form>
    </Page>
  )
}
