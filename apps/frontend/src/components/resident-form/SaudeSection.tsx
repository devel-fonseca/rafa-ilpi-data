// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - SaudeSection (Formulário de Residente)
// ──────────────────────────────────────────────────────────────────────────────

import { useRef } from 'react'
import { useFormContext, Controller, useFieldArray } from 'react-hook-form'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ResidentFormData } from './types'

// ========== COMPONENT ==========

export function SaudeSection() {
  const { register, control, watch } = useFormContext<ResidentFormData>()
  const medicamentosInputRef = useRef<HTMLInputElement>(null)

  const {
    fields: medicamentosFields,
    append: appendMedicamento,
    remove: removeMedicamento,
  } = useFieldArray({
    control,
    name: 'medicamentos',
  })

  return (
    <div className="space-y-6">
      {/* Dados Antropométricos */}
      <div className="bg-muted border border-border rounded-lg p-4">
        <h4 className="text-sm font-bold text-foreground mb-4 pb-2 border-b border-border">
          Dados Antropométricos
        </h4>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-3">
            <Label>Tipo Sanguíneo</Label>
            <Controller
              name="tipoSanguineo"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="col-span-12 md:col-span-3">
            <Label>Altura (cm)</Label>
            <Input
              {...register('altura')}
              type="text"
              inputMode="numeric"
              placeholder="170"
              className="mt-2"
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '')
                const limited = value.slice(0, 3)
                e.target.value = limited
                register('altura').onChange(e)
              }}
            />
          </div>

          <div className="col-span-12 md:col-span-3">
            <Label>Peso (kg)</Label>
            <Input
              {...register('peso')}
              placeholder="70,5"
              className="mt-2"
            />
          </div>

          <div className="col-span-12 md:col-span-3">
            <Label>Grau de Dependência</Label>
            <Controller
              name="grauDependencia"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Grau I - Independente">
                      Grau I - Independente
                    </SelectItem>
                    <SelectItem value="Grau II - Parcialmente Dependente">
                      Grau II - Parcialmente Dependente
                    </SelectItem>
                    <SelectItem value="Grau III - Totalmente Dependente">
                      Grau III - Totalmente Dependente
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </div>

      {/* Situação de Saúde */}
      <div className="bg-muted border border-border rounded-lg p-4">
        <h4 className="text-sm font-bold text-foreground mb-4 pb-2 border-b border-border">
          Situação de Saúde
        </h4>
        <div className="grid grid-cols-12 gap-4">
          {/* Medicamentos com Badges */}
          <div className="col-span-12 md:col-span-6">
            <Label className="text-sm font-semibold mb-2 block">
              Medicamentos em uso na admissão
            </Label>
            {medicamentosFields.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2 p-2 bg-info/10 border border-info/30 rounded min-h-[40px]">
                {medicamentosFields.map((field, index) => {
                  const nome = watch(`medicamentos.${index}.nome`)
                  return nome && nome.trim() ? (
                    <div
                      key={field.id}
                      className="flex items-center gap-1 bg-info text-info-foreground px-2 py-0.5 rounded-full text-xs font-medium"
                    >
                      <span>{nome}</span>
                      <button
                        type="button"
                        onClick={() => removeMedicamento(index)}
                        className="hover:opacity-80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : null
                })}
              </div>
            )}
            <div className="flex gap-1">
              <Input
                ref={medicamentosInputRef}
                placeholder="Adicionar medicamento..."
                className="text-xs h-8"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    e.preventDefault()
                    appendMedicamento({ nome: e.currentTarget.value })
                    e.currentTarget.value = ''
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => {
                  if (medicamentosInputRef.current?.value.trim()) {
                    appendMedicamento({ nome: medicamentosInputRef.current.value })
                    medicamentosInputRef.current.value = ''
                  }
                }}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Auxílio Mobilidade */}
          <div className="col-span-12">
            <div className="flex items-center gap-2 p-3 bg-info/10 border border-info/30 rounded-lg">
              <Controller
                name="necessitaAuxilioMobilidade"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    id="necessitaAuxilioMobilidade"
                  />
                )}
              />
              <Label
                htmlFor="necessitaAuxilioMobilidade"
                className="font-semibold cursor-pointer text-sm"
              >
                Necessita auxílio para mobilidade
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Nota sobre dados clínicos */}
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <p>
          <strong>Nota:</strong> Dados clínicos evolutivos (condições crônicas, alergias,
          restrições alimentares) são gerenciados no Prontuário do residente após o cadastro.
        </p>
      </div>
    </div>
  )
}
