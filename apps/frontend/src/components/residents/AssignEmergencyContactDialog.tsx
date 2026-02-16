// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - AssignEmergencyContactDialog (Cadastro de contato de emergência via alertas)
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
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
import { AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MaskedInput } from '@/components/form/MaskedInput'
import { api } from '@/services/api'
import { tenantKey } from '@/lib/query-keys'
import { toast } from 'sonner'

// ========== TYPES ==========

interface ContactFormData {
  nome: string
  telefone: string
  parentesco: string
}

const EMPTY_FORM: ContactFormData = {
  nome: '',
  telefone: '',
  parentesco: '',
}

interface AssignEmergencyContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  residentName: string
  onSuccess?: () => void
}

// ========== COMPONENT ==========

export function AssignEmergencyContactDialog({
  open,
  onOpenChange,
  residentId,
  residentName,
  onSuccess,
}: AssignEmergencyContactDialogProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ContactFormData>(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const updateField = (field: keyof ContactFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleConfirm = async () => {
    if (!form.nome.trim()) {
      setError('Nome do contato é obrigatório')
      return
    }
    if (!form.telefone.trim()) {
      setError('Telefone do contato é obrigatório')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await api.patch(`/residents/${residentId}`, {
        emergencyContacts: [
          {
            name: form.nome,
            phone: form.telefone,
            relationship: form.parentesco || '',
          },
        ],
        changeReason: 'Cadastro de contato de emergência via painel de alertas',
      })

      toast.success('Contato de emergência cadastrado!', {
        description: `Contato de ${residentName} foi atualizado.`,
      })

      queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'list') })
      queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'stats') })

      setForm(EMPTY_FORM)
      onOpenChange(false)
      onSuccess?.()
    } catch (err: unknown) {
      const errorResponse = (err as { response?: { data?: { message?: string } } }).response
      setError(errorResponse?.data?.message || 'Erro ao cadastrar contato de emergência')
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cadastrar Contato de Emergência</DialogTitle>
          <DialogDescription>
            Preencha os dados do contato de emergência de <strong>{residentName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nome */}
          <div>
            <Label>Nome do Contato <span className="text-danger">*</span></Label>
            <Input
              value={form.nome}
              onChange={(e) => updateField('nome', e.target.value)}
              className="mt-1.5"
            />
          </div>

          {/* Telefone e Parentesco */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-6">
              <Label>Telefone <span className="text-danger">*</span></Label>
              <MaskedInput
                mask="(99) 99999-9999"
                value={form.telefone}
                onChange={(e) => updateField('telefone', e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <Label>Parentesco</Label>
              <Input
                value={form.parentesco}
                onChange={(e) => updateField('parentesco', e.target.value)}
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
              'Cadastrar Contato'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
