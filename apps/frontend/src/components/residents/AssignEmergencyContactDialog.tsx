// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - AssignEmergencyContactDialog (Cadastro de contato de emergência via alertas)
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { residentsAPI } from '@/api/residents.api'
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
  const [initialForm, setInitialForm] = useState<ContactFormData>(EMPTY_FORM)
  const [initialContacts, setInitialContacts] = useState<Array<{ name: string; phone: string; relationship: string }>>([])
  const [editingContactIndex, setEditingContactIndex] = useState<number>(-1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const {
    data: residentData,
    isLoading: isLoadingResidentData,
    isError: isResidentDataError,
  } = useQuery({
    queryKey: tenantKey('residents', residentId),
    queryFn: () => residentsAPI.getById(residentId),
    enabled: open && !!residentId,
    staleTime: 1000 * 60 * 2,
  })

  useEffect(() => {
    if (!open || !residentData) return

    const existingContacts = Array.isArray(residentData.emergencyContacts)
      ? residentData.emergencyContacts
      : []
    const firstIncompleteIndex = existingContacts.findIndex((contact) => {
      const name = contact?.name?.trim() || ''
      const phone = contact?.phone?.trim() || ''
      return name.length === 0 || phone.length === 0
    })
    const selectedIndex = firstIncompleteIndex >= 0
      ? firstIncompleteIndex
      : existingContacts.length > 0
        ? 0
        : -1
    const selectedContact = selectedIndex >= 0 ? existingContacts[selectedIndex] : undefined

    const loadedForm: ContactFormData = {
      nome: selectedContact?.name || '',
      telefone: selectedContact?.phone || '',
      parentesco: selectedContact?.relationship || '',
    }

    setForm(loadedForm)
    setInitialForm(loadedForm)
    setInitialContacts(existingContacts)
    setEditingContactIndex(selectedIndex)
    setError('')
  }, [open, residentData])

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
      const normalizeDigits = (value: string) => value.replace(/\D/g, '')
      const normalizeName = (value: string) => value.trim()
      const normalizeRelationship = (value: string) => value.trim()

      const currentNormalized = {
        nome: normalizeName(form.nome),
        telefone: normalizeDigits(form.telefone),
        parentesco: normalizeRelationship(form.parentesco),
      }
      const initialNormalized = {
        nome: normalizeName(initialForm.nome),
        telefone: normalizeDigits(initialForm.telefone),
        parentesco: normalizeRelationship(initialForm.parentesco),
      }

      const hasChanged =
        currentNormalized.nome !== initialNormalized.nome ||
        currentNormalized.telefone !== initialNormalized.telefone ||
        currentNormalized.parentesco !== initialNormalized.parentesco

      if (!hasChanged) {
        toast.info('Nenhuma alteração detectada', {
          description: 'Os dados do contato de emergência já estão atualizados.',
        })
        setIsSubmitting(false)
        return
      }

      const updatedPrimaryContact = {
        name: currentNormalized.nome,
        phone: form.telefone.trim(),
        relationship: currentNormalized.parentesco,
      }

      const mergedContacts = [...initialContacts]
      if (editingContactIndex >= 0 && editingContactIndex < mergedContacts.length) {
        mergedContacts[editingContactIndex] = updatedPrimaryContact
      } else {
        mergedContacts.push(updatedPrimaryContact)
      }

      await api.patch(`/residents/${residentId}`, {
        emergencyContacts: mergedContacts,
        changeReason: 'Atualização de contato de emergência via painel de alertas',
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
    setInitialForm(EMPTY_FORM)
    setInitialContacts([])
    setEditingContactIndex(-1)
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
          {isLoadingResidentData && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando dados atuais do contato...
            </div>
          )}

          {isResidentDataError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Não foi possível carregar os dados atuais do residente.
              </AlertDescription>
            </Alert>
          )}

          {/* Nome */}
          <div>
            <Label>Nome do Contato <span className="text-danger">*</span></Label>
            <Input
              value={form.nome}
              onChange={(e) => updateField('nome', e.target.value)}
              className="mt-1.5"
              disabled={isLoadingResidentData}
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
                disabled={isLoadingResidentData}
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <Label>Parentesco</Label>
              <Input
                value={form.parentesco}
                onChange={(e) => updateField('parentesco', e.target.value)}
                className="mt-1.5"
                disabled={isLoadingResidentData}
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
            disabled={isSubmitting || isLoadingResidentData || !form.nome.trim() || !form.telefone.trim()}
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
