// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - AssignGuardianDialog (Cadastro de responsável legal via alertas)
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MaskedInput } from '@/components/form/MaskedInput'
import { api } from '@/services/api'
import { buscarCEP } from '@/services/viacep'
import { tenantKey } from '@/lib/query-keys'
import { toast } from 'sonner'

// ========== TYPES ==========

interface GuardianFormData {
  nome: string
  cpf: string
  rg: string
  tipo: string
  email: string
  telefone: string
  cep: string
  uf: string
  cidade: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
}

const EMPTY_FORM: GuardianFormData = {
  nome: '',
  cpf: '',
  rg: '',
  tipo: '',
  email: '',
  telefone: '',
  cep: '',
  uf: '',
  cidade: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
}

interface AssignGuardianDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  residentName: string
  onSuccess?: () => void
}

// ========== COMPONENT ==========

export function AssignGuardianDialog({
  open,
  onOpenChange,
  residentId,
  residentName,
  onSuccess,
}: AssignGuardianDialogProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<GuardianFormData>(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const updateField = (field: keyof GuardianFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleBuscarCep = useCallback(async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length === 8) {
      const endereco = await buscarCEP(cepLimpo)
      if (endereco) {
        setForm((prev) => ({
          ...prev,
          uf: endereco.estado,
          cidade: endereco.cidade,
          logradouro: endereco.logradouro,
          bairro: endereco.bairro,
          complemento: endereco.complemento || prev.complemento,
        }))
      }
    }
  }, [])

  const handleConfirm = async () => {
    if (!form.nome.trim()) {
      setError('Nome do responsável é obrigatório')
      return
    }
    if (!form.telefone.trim()) {
      setError('Telefone do responsável é obrigatório')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await api.patch(`/residents/${residentId}`, {
        legalGuardianName: form.nome || null,
        legalGuardianCpf: form.cpf || null,
        legalGuardianRg: form.rg || null,
        legalGuardianType: form.tipo || null,
        legalGuardianEmail: form.email || null,
        legalGuardianPhone: form.telefone || null,
        legalGuardianCep: form.cep || null,
        legalGuardianState: form.uf || null,
        legalGuardianCity: form.cidade || null,
        legalGuardianStreet: form.logradouro || null,
        legalGuardianNumber: form.numero || null,
        legalGuardianComplement: form.complemento || null,
        legalGuardianDistrict: form.bairro || null,
        changeReason: 'Cadastro de responsável legal via painel de alertas',
      })

      toast.success('Responsável legal cadastrado!', {
        description: `Responsável de ${residentName} foi atualizado.`,
      })

      queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'list') })
      queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'stats') })

      setForm(EMPTY_FORM)
      onOpenChange(false)
      onSuccess?.()
    } catch (err: unknown) {
      const errorResponse = (err as { response?: { data?: { message?: string } } }).response
      setError(errorResponse?.data?.message || 'Erro ao cadastrar responsável')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setForm(EMPTY_FORM)
    setError('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Cadastrar Responsável Legal</DialogTitle>
          <DialogDescription>
            Preencha os dados do responsável legal de <strong>{residentName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {/* Nome */}
          <div>
            <Label>Nome do Responsável <span className="text-danger">*</span></Label>
            <Input
              value={form.nome}
              onChange={(e) => updateField('nome', e.target.value)}
              className="mt-1.5"
            />
          </div>

          {/* CPF, RG, Tipo */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-4">
              <Label>CPF</Label>
              <MaskedInput
                mask="999.999.999-99"
                value={form.cpf}
                onChange={(e) => updateField('cpf', e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <Label>RG</Label>
              <MaskedInput
                mask="99.999.999-9"
                value={form.rg}
                onChange={(e) => updateField('rg', e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <Label>Tipo</Label>
              <Select onValueChange={(v) => updateField('tipo', v)} value={form.tipo}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Curador(a)">Curador(a)</SelectItem>
                  <SelectItem value="Procurador(a)">Procurador(a)</SelectItem>
                  <SelectItem value="Responsável Familiar (Convencional)">Responsável Familiar</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Email e Telefone */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-6">
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                type="email"
                placeholder="email@exemplo.com"
                className="mt-1.5"
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <Label>Telefone <span className="text-danger">*</span></Label>
              <MaskedInput
                mask="(99) 99999-9999"
                value={form.telefone}
                onChange={(e) => updateField('telefone', e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Endereço */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-3">
              <Label>CEP</Label>
              <MaskedInput
                mask="99999-999"
                value={form.cep}
                onChange={(e) => {
                  updateField('cep', e.target.value)
                  handleBuscarCep(e.target.value)
                }}
                className="mt-1.5"
              />
            </div>
            <div className="col-span-12 md:col-span-2">
              <Label>UF</Label>
              <Input
                value={form.uf}
                onChange={(e) => updateField('uf', e.target.value.toUpperCase())}
                maxLength={2}
                className="mt-1.5 uppercase"
              />
            </div>
            <div className="col-span-12 md:col-span-7">
              <Label>Cidade</Label>
              <Input
                value={form.cidade}
                onChange={(e) => updateField('cidade', e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <Label>Logradouro</Label>
              <Input
                value={form.logradouro}
                onChange={(e) => updateField('logradouro', e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="col-span-12 md:col-span-2">
              <Label>Número</Label>
              <Input
                value={form.numero}
                onChange={(e) => updateField('numero', e.target.value)}
                placeholder="S/N"
                className="mt-1.5"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <Label>Complemento</Label>
              <Input
                value={form.complemento}
                onChange={(e) => updateField('complemento', e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="col-span-12 md:col-span-5">
              <Label>Bairro</Label>
              <Input
                value={form.bairro}
                onChange={(e) => updateField('bairro', e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || !form.nome.trim() || !form.telefone.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Cadastrar Responsável'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
