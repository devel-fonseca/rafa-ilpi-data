// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - EnderecoSection (Formulário de Residente)
// ──────────────────────────────────────────────────────────────────────────────

import { useFormContext, Controller } from 'react-hook-form'
import { Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { MaskedInput } from '@/components/form/MaskedInput'
import type { ResidentFormData } from './types'

// ========== TYPES ==========

interface EnderecoSectionProps {
  onBuscarCep: (cep: string, prefix: 'atual' | 'procedencia' | 'responsavelLegal') => void
}

// ========== COMPONENT ==========

export function EnderecoSection({ onBuscarCep }: EnderecoSectionProps) {
  const { register, control } = useFormContext<ResidentFormData>()

  return (
    <div className="space-y-8">
      {/* Endereço Atual */}
      <div>
        <h4 className="font-medium text-sm text-muted-foreground mb-4">
          Endereço Atual
        </h4>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-3">
            <Label>CEP</Label>
            <Controller
              name="cepAtual"
              control={control}
              render={({ field }) => (
                <MaskedInput
                  mask="99999-999"
                  value={field.value ?? ''}
                  onChange={(e) => {
                    field.onChange(e)
                    onBuscarCep(e.target.value, 'atual')
                  }}
                  className="mt-2"
                />
              )}
            />
          </div>

          <div className="col-span-12 md:col-span-2">
            <Label>UF</Label>
            <Input
              {...register('estadoAtual')}
              maxLength={2}
              className="mt-2 uppercase"
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase()
                register('estadoAtual').onChange(e)
              }}
            />
          </div>

          <div className="col-span-12 md:col-span-7">
            <Label>Cidade</Label>
            <Input {...register('cidadeAtual')} className="mt-2" />
          </div>

          <div className="col-span-12 md:col-span-6">
            <Label>Logradouro</Label>
            <Input {...register('logradouroAtual')} className="mt-2" />
          </div>

          <div className="col-span-12 md:col-span-2">
            <Label>Número</Label>
            <Input
              {...register('numeroAtual')}
              placeholder="S/N"
              className="mt-2"
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <Label>Complemento</Label>
            <Input {...register('complementoAtual')} className="mt-2" />
          </div>

          <div className="col-span-12 md:col-span-5">
            <Label>Bairro</Label>
            <Input {...register('bairroAtual')} className="mt-2" />
          </div>
        </div>
      </div>

      {/* Email e Telefone */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-6">
          <Label>Email</Label>
          <Input
            {...register('email')}
            type="email"
            placeholder="email@exemplo.com"
            className="mt-2"
          />
        </div>

        <div className="col-span-12 md:col-span-6">
          <Label>Telefone</Label>
          <Controller
            name="telefoneAtual"
            control={control}
            render={({ field }) => (
              <MaskedInput
                mask="(99) 99999-9999"
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder="(99) 99999-9999"
                className="mt-2"
              />
            )}
          />
        </div>
      </div>

      {/* Procedência */}
      <div>
        <div className="flex items-center gap-1.5">
          <Label>Procedência</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger type="button">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>De onde veio o residente</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Textarea
          {...register('procedencia')}
          placeholder="Ex: Residência própria, casa de familiares, hospital, outra ILPI..."
          className="mt-2"
          rows={3}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Máximo de 255 caracteres
        </p>
      </div>
    </div>
  )
}
