// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - AdmissaoSection (Formulário de Residente)
// ──────────────────────────────────────────────────────────────────────────────

import { useFormContext, Controller } from 'react-hook-form'
import { Info } from 'lucide-react'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { MaskedInput } from '@/components/form/MaskedInput'
import { BedSearchCombobox } from '@/components/beds/BedSearchCombobox'
import type { ResidentFormData } from './types'

// ========== TYPES ==========

interface AdmissaoSectionProps {
  readOnly?: boolean
}

// ========== COMPONENT ==========

export function AdmissaoSection({ readOnly = false }: AdmissaoSectionProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ResidentFormData>()

  return (
    <div className="space-y-6">
      {/* Dados de Admissão */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-3">
          <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
            Data de Admissão
          </Label>
          <Controller
            name="dataAdmissao"
            control={control}
            render={({ field }) => (
              <MaskedInput
                mask="99/99/9999"
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder="DD/MM/AAAA"
                className="mt-2"
              />
            )}
          />
          {errors.dataAdmissao && (
            <p className="text-sm text-danger mt-1">
              {errors.dataAdmissao.message}
            </p>
          )}
        </div>

        <div className="col-span-12 md:col-span-4">
          <Label>Tipo de Admissão</Label>
          <Controller
            name="tipoAdmissao"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Voluntária">Voluntária</SelectItem>
                  <SelectItem value="Involuntária">Involuntária</SelectItem>
                  <SelectItem value="Judicial">Judicial</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="col-span-12 md:col-span-5">
          <Label>Motivo da Admissão</Label>
          <Input {...register('motivoAdmissao')} className="mt-2" />
        </div>

        <div className="col-span-12">
          <Label>Condições de Admissão</Label>
          <Textarea
            {...register('condicoesAdmissao')}
            rows={2}
            placeholder="Descreva as condições em que o residente foi admitido..."
            className="mt-2"
          />
        </div>

        <div className="col-span-12 md:col-span-3">
          <Label>Data de Desligamento</Label>
          <Controller
            name="dataDesligamento"
            control={control}
            render={({ field }) => (
              <MaskedInput
                mask="99/99/9999"
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder="DD/MM/AAAA"
                className="mt-2"
              />
            )}
          />
        </div>

        <div className="col-span-12 md:col-span-9">
          <Label>Motivo do Desligamento</Label>
          <Input {...register('motivoDesligamento')} className="mt-2" />
        </div>
      </div>

      {/* Acomodação */}
      <div>
        <div className="flex items-center gap-1.5 mb-4">
          <h4 className="font-medium text-sm text-muted-foreground">
            Acomodação
          </h4>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger type="button">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Vincule um leito ao residente para organizar a assistência e facilitar o acompanhamento da rotina.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Controller
          name="leitoNumero"
          control={control}
          render={({ field }) => (
            <BedSearchCombobox
              value={field.value ?? ''}
              onValueChange={(bedId) => {
                field.onChange(bedId)
              }}
              disabled={readOnly}
              placeholder="Digite o código do leito, prédio ou quarto..."
            />
          )}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Busque por código do leito, nome do prédio ou número do quarto
        </p>
      </div>
    </div>
  )
}
