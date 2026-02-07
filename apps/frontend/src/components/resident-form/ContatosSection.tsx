// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - ContatosSection (Formulário de Residente)
// ──────────────────────────────────────────────────────────────────────────────

import { useFormContext, Controller, useFieldArray } from 'react-hook-form'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MaskedInput } from '@/components/form/MaskedInput'
import type { ResidentFormData } from './types'

// ========== COMPONENT ==========

export function ContatosSection() {
  const { register, control } = useFormContext<ResidentFormData>()

  const {
    fields: contatosFields,
    append: appendContato,
    remove: removeContato,
  } = useFieldArray({
    control,
    name: 'contatosEmergencia',
  })

  return (
    <div className="space-y-4">
      {/* Botão adicionar no topo */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          appendContato({
            nome: '',
            telefone: '',
            parentesco: '',
          })
        }
      >
        <Plus className="w-4 h-4 mr-2" />
        Adicionar Contato
      </Button>

      {/* Lista de contatos */}
      <div className="space-y-4">
        {contatosFields.map((field, index) => (
          <div
            key={field.id}
            className="grid grid-cols-12 gap-3 items-end"
          >
            <div className="col-span-12 md:col-span-5">
              <Label className="text-xs">Nome completo</Label>
              <Input
                {...register(`contatosEmergencia.${index}.nome`)}
                className="mt-1"
              />
            </div>
            <div className="col-span-6 md:col-span-3">
              <Label className="text-xs">Telefone</Label>
              <Controller
                name={`contatosEmergencia.${index}.telefone`}
                control={control}
                render={({ field }) => (
                  <MaskedInput
                    mask="(99) 99999-9999"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder="(99) 99999-9999"
                    className="mt-1"
                  />
                )}
              />
            </div>
            <div className="col-span-5 md:col-span-3">
              <Label className="text-xs">Parentesco</Label>
              <Input
                {...register(`contatosEmergencia.${index}.parentesco`)}
                className="mt-1"
              />
            </div>
            <div className="col-span-1 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeContato(index)}
                className="text-danger hover:text-danger/80 hover:bg-danger/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {contatosFields.length === 0 && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg text-center">
          Nenhum contato de emergência cadastrado. Clique em "Adicionar Contato" para incluir.
        </div>
      )}
    </div>
  )
}
