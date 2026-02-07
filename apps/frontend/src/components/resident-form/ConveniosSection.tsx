// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - ConveniosSection (Formulário de Residente)
// ──────────────────────────────────────────────────────────────────────────────

import { useFormContext, useFieldArray } from 'react-hook-form'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ResidentFormData } from './types'

// ========== COMPONENT ==========

export function ConveniosSection() {
  const { register, control } = useFormContext<ResidentFormData>()

  const {
    fields: conveniosFields,
    append: appendConvenio,
    remove: removeConvenio,
  } = useFieldArray({
    control,
    name: 'convenios',
  })

  return (
    <div className="space-y-4">
      {/* Botão adicionar no topo */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => appendConvenio({ nome: '', numero: '' })}
      >
        <Plus className="w-4 h-4 mr-2" />
        Adicionar Convênio
      </Button>

      {/* Lista de convênios */}
      <div className="space-y-4">
        {conveniosFields.map((field, index) => (
          <div
            key={field.id}
            className="grid grid-cols-12 gap-3 items-end"
          >
            <div className="col-span-12 md:col-span-5">
              <Label className="text-xs">Nome do Convênio</Label>
              <Input
                {...register(`convenios.${index}.nome`)}
                placeholder="Ex: Unimed, Bradesco Saúde..."
                className="mt-1"
              />
            </div>
            <div className="col-span-11 md:col-span-6">
              <Label className="text-xs">Número da Carteirinha</Label>
              <Input
                {...register(`convenios.${index}.numero`)}
                placeholder="Ex: 0000.0000.0000.0000"
                className="mt-1"
              />
            </div>
            <div className="col-span-1 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeConvenio(index)}
                className="text-danger hover:text-danger/80 hover:bg-danger/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {conveniosFields.length === 0 && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg text-center">
          Nenhum convênio cadastrado. Clique em "Adicionar Convênio" para incluir.
        </div>
      )}
    </div>
  )
}
