import { UseFormRegister, UseFormSetValue, FieldErrors } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { ResidentFormData } from '@/pages/residents/ResidentForm'
import { buscarCEP } from '@/services/cepService'

interface AddressFieldsProps {
  prefix: 'atual' | 'procedencia' | 'responsavelLegal'
  register: UseFormRegister<ResidentFormData>
  setValue: UseFormSetValue<ResidentFormData>
  errors: FieldErrors<ResidentFormData>
  onCepChange: (cep: string, prefix: 'atual' | 'procedencia' | 'responsavelLegal') => void
}

const fieldMapping = {
  atual: {
    cep: 'cepAtual',
    estado: 'estadoAtual',
    cidade: 'cidadeAtual',
    logradouro: 'logradouroAtual',
    numero: 'numeroAtual',
    complemento: 'complementoAtual',
    bairro: 'bairroAtual',
    telefone: 'telefoneAtual'
  },
  procedencia: {
    cep: 'cepProcedencia',
    estado: 'estadoProcedencia',
    cidade: 'cidadeProcedencia',
    logradouro: 'logradouroProcedencia',
    numero: 'numeroProcedencia',
    complemento: 'complementoProcedencia',
    bairro: 'bairroProcedencia',
    telefone: 'telefoneProcedencia'
  },
  responsavelLegal: {
    cep: 'responsavelLegalCep',
    estado: 'responsavelLegalUf',
    cidade: 'responsavelLegalCidade',
    logradouro: 'responsavelLegalLogradouro',
    numero: 'responsavelLegalNumero',
    complemento: 'responsavelLegalComplemento',
    bairro: 'responsavelLegalBairro',
    telefone: 'responsavelLegalTelefone'
  }
}

export function AddressFields({
  prefix,
  register,
  setValue,
  errors,
  onCepChange
}: AddressFieldsProps) {
  const fields = fieldMapping[prefix]
  const getErrorMessage = (fieldName: keyof typeof fields): string | undefined => {
    const key = fields[fieldName]
    return errors[key]?.message as string | undefined
  }

  return (
    <div className="space-y-4">
      {/* CEP e Busca */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-3">
          <Label htmlFor={fields.cep}>CEP</Label>
          <div className="flex gap-2 mt-2">
            <Input
              id={fields.cep}
              placeholder="00000-000"
              {...register(fields.cep as keyof ResidentFormData)}
              onChange={(e) => {
                onCepChange(e.target.value, prefix)
              }}
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              className="mt-[26px] px-3"
              onClick={async () => {
                const cepValue = document.getElementById(fields.cep) as HTMLInputElement
                if (cepValue?.value) {
                  const cepLimpo = cepValue.value.replace(/\D/g, '')
                  if (cepLimpo.length === 8) {
                    const endereco = await buscarCEP(cepLimpo)
                    if (endereco) {
                      setValue(fields.estado, endereco.estado)
                      setValue(fields.cidade, endereco.cidade)
                      setValue(fields.logradouro, endereco.logradouro)
                      setValue(fields.bairro, endereco.bairro)
                      if (endereco.complemento) {
                        setValue(fields.complemento, endereco.complemento)
                      }
                    }
                  }
                }
              }}
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
          {getErrorMessage('cep') && (
            <span className="text-xs text-danger mt-1">{getErrorMessage('cep')}</span>
          )}
        </div>

        {/* Estado */}
        <div className="col-span-12 md:col-span-3">
          <Label htmlFor={fields.estado}>Estado</Label>
          <Input
            id={fields.estado}
            maxLength={2}
            className="uppercase mt-2"
            {...register(fields.estado as keyof ResidentFormData)}
            onChange={(e) => {
              e.target.value = e.target.value.toUpperCase()
            }}
          />
          {getErrorMessage('estado') && (
            <span className="text-xs text-danger mt-1">{getErrorMessage('estado')}</span>
          )}
        </div>

        {/* Cidade */}
        <div className="col-span-12 md:col-span-6">
          <Label htmlFor={fields.cidade}>Cidade</Label>
          <Input
            id={fields.cidade}
            placeholder="Cidade"
            className="mt-2"
            {...register(fields.cidade as keyof ResidentFormData)}
          />
          {getErrorMessage('cidade') && (
            <span className="text-xs text-danger mt-1">{getErrorMessage('cidade')}</span>
          )}
        </div>
      </div>

      {/* Logradouro, Número, Complemento */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-6">
          <Label htmlFor={fields.logradouro}>Logradouro</Label>
          <Input
            id={fields.logradouro}
            placeholder="Rua, Avenida, etc"
            className="mt-2"
            {...register(fields.logradouro as keyof ResidentFormData)}
          />
          {getErrorMessage('logradouro') && (
            <span className="text-xs text-danger mt-1">{getErrorMessage('logradouro')}</span>
          )}
        </div>

        <div className="col-span-12 md:col-span-3">
          <Label htmlFor={fields.numero}>Número</Label>
          <Input
            id={fields.numero}
            placeholder="123"
            className="mt-2"
            {...register(fields.numero as keyof ResidentFormData)}
          />
          {getErrorMessage('numero') && (
            <span className="text-xs text-danger mt-1">{getErrorMessage('numero')}</span>
          )}
        </div>

        <div className="col-span-12 md:col-span-3">
          <Label htmlFor={fields.complemento}>Complemento</Label>
          <Input
            id={fields.complemento}
            placeholder="Apt 101"
            className="mt-2"
            {...register(fields.complemento as keyof ResidentFormData)}
          />
          {getErrorMessage('complemento') && (
            <span className="text-xs text-danger mt-1">{getErrorMessage('complemento')}</span>
          )}
        </div>
      </div>

      {/* Bairro e Telefone */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-6">
          <Label htmlFor={fields.bairro}>Bairro</Label>
          <Input
            id={fields.bairro}
            placeholder="Bairro"
            className="mt-2"
            {...register(fields.bairro as keyof ResidentFormData)}
          />
          {getErrorMessage('bairro') && (
            <span className="text-xs text-danger mt-1">{getErrorMessage('bairro')}</span>
          )}
        </div>

        <div className="col-span-12 md:col-span-6">
          <Label htmlFor={fields.telefone}>Telefone</Label>
          <Input
            id={fields.telefone}
            placeholder="(11) 98765-4321"
            className="mt-2"
            {...register(fields.telefone as keyof ResidentFormData)}
          />
          {getErrorMessage('telefone') && (
            <span className="text-xs text-danger mt-1">{getErrorMessage('telefone')}</span>
          )}
        </div>
      </div>
    </div>
  )
}
