// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - IdentificacaoSection (Formulário de Residente)
// ──────────────────────────────────────────────────────────────────────────────

import { useFormContext, Controller } from 'react-hook-form'
import { Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { PhotoUploadNew } from '@/components/form/PhotoUploadNew'
import { MaskedInput } from '@/components/form/MaskedInput'
import type { ResidentFormData, CpfValidation, CnsValidation } from './types'

// ========== CONSTANTS ==========

const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

// ========== TYPES ==========

interface IdentificacaoSectionProps {
  currentPhotoUrl?: string
  onPhotoChange: (file: File | null, previewUrl?: string) => void
  cpfValidation: CpfValidation
  cnsValidation: CnsValidation
  birthDateFeedback: { message: string; isError: boolean } | null
}

// ========== COMPONENT ==========

export function IdentificacaoSection({
  currentPhotoUrl,
  onPhotoChange,
  cpfValidation,
  cnsValidation,
  birthDateFeedback,
}: IdentificacaoSectionProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ResidentFormData>()

  return (
    <div className="space-y-4">
      {/* Foto - linha própria */}
      <div>
        <PhotoUploadNew
          onPhotoSelect={(file) => {
            if (file) {
              const reader = new FileReader()
              reader.onload = (event) => {
                onPhotoChange(file, event.target?.result as string)
              }
              reader.readAsDataURL(file)
            } else {
              onPhotoChange(null)
            }
          }}
          currentPhotoUrl={currentPhotoUrl}
          label="Foto do Residente"
          description="Clique ou arraste"
          maxSize={5}
        />
      </div>

      {/* Nome completo - linha própria */}
      <div>
        <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
          Nome completo
        </Label>
        <Input {...register('nome')} className="mt-1.5" />
        {errors.nome && (
          <p className="text-sm text-danger mt-1">{errors.nome.message}</p>
        )}
      </div>

      {/* Nome social - linha própria */}
      <div>
        <Label>Nome social</Label>
        <Input {...register('nomeSocial')} className="mt-1.5" />
      </div>

      {/* Data de Nascimento e CNS - uma linha */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-4">
          <div className="flex items-center gap-1.5">
            <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
              Data de Nascimento
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger type="button">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Residentes devem ter 60 anos ou mais (art. 2º, RDC nº 502/2021).</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Controller
            name="dataNascimento"
            control={control}
            render={({ field }) => (
              <MaskedInput
                mask="99/99/9999"
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder="DD/MM/AAAA"
                className="mt-1.5"
              />
            )}
          />
          {birthDateFeedback && (
            <p
              className={`text-xs mt-1 ${
                birthDateFeedback.message.startsWith('✓')
                  ? 'text-success'
                  : birthDateFeedback.isError
                  ? 'text-danger'
                  : 'text-muted-foreground'
              }`}
            >
              {birthDateFeedback.message}
            </p>
          )}
        </div>

        <div className="col-span-12 md:col-span-8">
          <Label>CNS</Label>
          <Controller
            name="cns"
            control={control}
            render={({ field }) => (
              <MaskedInput
                mask="999 9999 9999 9999"
                value={field.value ?? ''}
                onChange={field.onChange}
                validation={cnsValidation}
                className="mt-1.5"
              />
            )}
          />
        </div>
      </div>

      {/* CPF, RG, Órgão Expedidor - uma linha */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-4">
          <Label className="after:content-['*'] after:ml-0.5 after:text-danger">CPF</Label>
          <Controller
            name="cpf"
            control={control}
            render={({ field }) => (
              <MaskedInput
                mask="999.999.999-99"
                value={field.value ?? ''}
                onChange={field.onChange}
                validation={cpfValidation}
                className="mt-1.5"
              />
            )}
          />
          {errors.cpf && (
            <p className="text-sm text-danger mt-1">{errors.cpf.message}</p>
          )}
        </div>

        <div className="col-span-12 md:col-span-4">
          <Label>RG</Label>
          <Controller
            name="rg"
            control={control}
            render={({ field }) => (
              <MaskedInput
                mask="99.999.999-9"
                value={field.value ?? ''}
                onChange={field.onChange}
                className="mt-1.5"
              />
            )}
          />
        </div>

        <div className="col-span-12 md:col-span-4">
          <Label>Órgão Expedidor</Label>
          <Input {...register('orgaoExpedidor')} className="mt-1.5" />
        </div>
      </div>

      {/* Escolaridade e Profissão - uma linha */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-6">
          <Label>Escolaridade</Label>
          <Input {...register('escolaridade')} className="mt-1.5" />
        </div>

        <div className="col-span-12 md:col-span-6">
          <Label>Profissão</Label>
          <Input {...register('profissao')} className="mt-1.5" />
        </div>
      </div>

      {/* Gênero, Estado Civil, Religião - uma linha */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-4">
          <Label className="after:content-['*'] after:ml-0.5 after:text-danger">Gênero</Label>
          <Controller
            name="genero"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MASCULINO">Masculino</SelectItem>
                  <SelectItem value="FEMININO">Feminino</SelectItem>
                  <SelectItem value="OUTRO">Outro</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.genero && (
            <p className="text-sm text-danger mt-1">{errors.genero.message}</p>
          )}
        </div>

        <div className="col-span-12 md:col-span-4">
          <Label>Estado Civil</Label>
          <Controller
            name="estadoCivil"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                  <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                  <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                  <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                  <SelectItem value="União Estável">União Estável</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="col-span-12 md:col-span-4">
          <Label>Religião</Label>
          <Input {...register('religiao')} className="mt-1.5" />
        </div>
      </div>

      {/* Nacionalidade, Local de Nascimento, UF - uma linha */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-4">
          <Label>Nacionalidade</Label>
          <Input {...register('nacionalidade')} className="mt-1.5" />
        </div>

        <div className="col-span-12 md:col-span-6">
          <Label>Local de Nascimento</Label>
          <Input {...register('naturalidade')} className="mt-1.5" />
        </div>

        <div className="col-span-6 md:col-span-2">
          <Label>UF</Label>
          <Controller
            name="ufNascimento"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {BR_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* Nome da Mãe - linha própria */}
      <div>
        <Label>Nome da Mãe</Label>
        <Input {...register('nomeMae')} className="mt-1.5" />
      </div>

      {/* Nome do Pai - linha própria */}
      <div>
        <Label>Nome do Pai</Label>
        <Input {...register('nomePai')} className="mt-1.5" />
      </div>
    </div>
  )
}
