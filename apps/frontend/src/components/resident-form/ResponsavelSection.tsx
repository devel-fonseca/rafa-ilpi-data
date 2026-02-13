// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - ResponsavelSection (Formulário de Residente)
// ──────────────────────────────────────────────────────────────────────────────

import { useFormContext, Controller } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MaskedInput } from '@/components/form/MaskedInput'
import type { ResidentFormData } from './types'

// ========== TYPES ==========

interface ResponsavelSectionProps {
  onBuscarCep: (cep: string, prefix: 'atual' | 'procedencia' | 'responsavelLegal') => void
}

// ========== COMPONENT ==========

export function ResponsavelSection({ onBuscarCep }: ResponsavelSectionProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ResidentFormData>()

  return (
    <div className="space-y-6">
      {/* Nome do Responsável - linha própria */}
      <div>
        <Label>Nome do Responsável</Label>
        <Input {...register('responsavelLegalNome')} className="mt-2" />
      </div>

      {/* CPF, RG, Tipo de Responsabilidade */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-4">
          <Label>CPF</Label>
          <Controller
            name="responsavelLegalCpf"
            control={control}
            render={({ field }) => (
              <MaskedInput
                mask="999.999.999-99"
                value={field.value ?? ''}
                onChange={field.onChange}
                className="mt-2"
              />
            )}
          />
        </div>

        <div className="col-span-12 md:col-span-4">
          <Label>RG</Label>
          <Controller
            name="responsavelLegalRg"
            control={control}
            render={({ field }) => (
              <MaskedInput
                mask="99.999.999-9"
                value={field.value ?? ''}
                onChange={field.onChange}
                className="mt-2"
              />
            )}
          />
        </div>

        <div className="col-span-12 md:col-span-4">
          <Label>Tipo de Responsabilidade</Label>
          <Controller
            name="responsavelLegalTipo"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Curador(a)">Curador(a)</SelectItem>
                  <SelectItem value="Procurador(a)">Procurador(a)</SelectItem>
                  <SelectItem value="Responsável Familiar (Convencional)">Responsável Familiar (Convencional)</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* Email e Telefone */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-6">
          <Label>Email</Label>
          <Input
            {...register('responsavelLegalEmail')}
            type="email"
            placeholder="email@exemplo.com"
            className="mt-2"
          />
          {errors.responsavelLegalEmail && (
            <p className="text-sm text-danger mt-1">
              {errors.responsavelLegalEmail.message}
            </p>
          )}
        </div>

        <div className="col-span-12 md:col-span-6">
          <Label>Telefone</Label>
          <Controller
            name="responsavelLegalTelefone"
            control={control}
            render={({ field }) => (
              <MaskedInput
                mask="(99) 99999-9999"
                value={field.value ?? ''}
                onChange={field.onChange}
                className="mt-2"
              />
            )}
          />
        </div>
      </div>

      {/* Endereço do Responsável */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-3">
          <Label>CEP</Label>
          <Controller
            name="responsavelLegalCep"
            control={control}
            render={({ field }) => (
              <MaskedInput
                mask="99999-999"
                value={field.value ?? ''}
                onChange={(e) => {
                  field.onChange(e)
                  onBuscarCep(e.target.value, 'responsavelLegal')
                }}
                className="mt-2"
              />
            )}
          />
        </div>

        <div className="col-span-12 md:col-span-2">
          <Label>UF</Label>
          <Input
            {...register('responsavelLegalUf')}
            maxLength={2}
            className="mt-2 uppercase"
            onChange={(e) => {
              e.target.value = e.target.value.toUpperCase()
              register('responsavelLegalUf').onChange(e)
            }}
          />
        </div>

        <div className="col-span-12 md:col-span-7">
          <Label>Cidade</Label>
          <Input {...register('responsavelLegalCidade')} className="mt-2" />
        </div>

        <div className="col-span-12 md:col-span-6">
          <Label>Logradouro</Label>
          <Input {...register('responsavelLegalLogradouro')} className="mt-2" />
        </div>

        <div className="col-span-12 md:col-span-2">
          <Label>Número</Label>
          <Input
            {...register('responsavelLegalNumero')}
            placeholder="S/N"
            className="mt-2"
          />
        </div>

        <div className="col-span-12 md:col-span-4">
          <Label>Complemento</Label>
          <Input {...register('responsavelLegalComplemento')} className="mt-2" />
        </div>

        <div className="col-span-12 md:col-span-5">
          <Label>Bairro</Label>
          <Input {...register('responsavelLegalBairro')} className="mt-2" />
        </div>
      </div>
    </div>
  )
}
