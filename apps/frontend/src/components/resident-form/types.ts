// ──────────────────────────────────────────────────────────────────────────────
//  TYPES - Formulário de Residente
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import { requiredString } from '@/lib/validation/requiredString'

// ========== VALIDATION TYPES ==========

export interface CpfValidation {
  valido: boolean
  mensagem: string
}

export interface CnsValidation {
  valido: boolean
  mensagem: string
}

// ========== SCHEMA ==========
export const residentSchema = z.object({
  // Status (opcional - apenas para modo edição)
  status: z.enum(['Ativo', 'Inativo', 'Falecido']).optional(),

  // Motivo da alteração (obrigatório apenas no modo edição - RDC 502/2021 Art. 39)
  changeReason: z.string().optional(),

  // Dados Pessoais
  foto: z.any().optional(),
  nome: requiredString('Nome', 3, 'Nome deve ter pelo menos 3 caracteres'),
  nomeSocial: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  cns: z.string().optional(),
  cpf: requiredString('CPF'),
  rg: z.string().optional(),
  orgaoExpedidor: z.string().optional(),
  escolaridade: z.string().optional(),
  profissao: z.string().optional(),
  genero: z
    .enum(['MASCULINO', 'FEMININO', 'OUTRO'])
    .refine((val) => val !== undefined, {
      message: 'Gênero é obrigatório',
    }),
  estadoCivil: z.string().optional(),
  religiao: z.string().optional(),
  dataNascimento: requiredString('Data de nascimento')
    .refine((dateStr) => {
      if (!dateStr) return true

      const [day, month, year] = dateStr.split('/').map(Number)
      if (!day || !month || !year) return false

      const birthDate = new Date(year, month - 1, day)
      const today = new Date()

      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      const dayDiff = today.getDate() - birthDate.getDate()

      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--
      }

      return age >= 60
    }, {
      message: 'Residente deve ter idade igual ou superior a 60 anos (RDC 502/2021 Art. 2º)'
    }),
  nacionalidade: z.string().optional(),
  naturalidade: z.string().optional(),
  ufNascimento: z.string().optional(),
  nomeMae: z.string().optional(),
  nomePai: z.string().optional(),
  documentosPessoaisUrls: z.array(z.any()).optional(),

  // Contatos
  telefoneAtual: z.string().optional(),
  contatosEmergencia: z
    .array(
      z.object({
        nome: z.string().optional(),
        telefone: z.string().optional(),
        parentesco: z.string().optional(),
      })
    )
    .optional(),

  // Endereço Atual
  cepAtual: z.string().optional(),
  estadoAtual: z.string().optional(),
  cidadeAtual: z.string().optional(),
  logradouroAtual: z.string().optional(),
  numeroAtual: z.string().optional(),
  complementoAtual: z.string().optional(),
  bairroAtual: z.string().optional(),

  // Procedência (texto livre)
  procedencia: z.string().max(255).optional(),
  documentosEnderecoUrls: z.array(z.any()).optional(),

  // Responsável Legal
  responsavelLegalNome: z.string().optional(),
  responsavelLegalEmail: z
    .string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
  responsavelLegalCpf: z.string().optional(),
  responsavelLegalRg: z.string().optional(),
  responsavelLegalTelefone: z.string().optional(),
  responsavelLegalTipo: z.string().optional(),
  responsavelLegalCep: z.string().optional(),
  responsavelLegalUf: z.string().optional(),
  responsavelLegalCidade: z.string().optional(),
  responsavelLegalLogradouro: z.string().optional(),
  responsavelLegalNumero: z.string().optional(),
  responsavelLegalComplemento: z.string().optional(),
  responsavelLegalBairro: z.string().optional(),
  responsavelLegalDocumentosUrls: z.array(z.any()).optional(),

  // Convênios
  convenios: z
    .array(
      z.object({
        nome: z.string().optional(),
        numero: z.string().optional(),
        arquivo: z.any().optional(),
      })
    )
    .optional(),

  // Admissão
  dataAdmissao: requiredString('Data de admissão'),
  tipoAdmissao: z.string().optional(),
  motivoAdmissao: z.string().optional(),
  condicoesAdmissao: z.string().optional(),
  dataDesligamento: z.string().optional(),
  motivoDesligamento: z.string().optional(),
  termoAdmissao: z.any().optional(),
  consentimentoLgpd: z.any().optional(),
  consentimentoImagem: z.any().optional(),

  // Acomodação
  leitoNumero: z.string().optional(),
})

// Schema com validação condicional para changeReason (obrigatório no modo edição)
export const getResidentSchema = (isEditMode: boolean) => {
  if (isEditMode) {
    return residentSchema.extend({
      changeReason: z
        .string()
        .min(10, 'Motivo da alteração deve ter no mínimo 10 caracteres')
        .refine((val) => val.trim().length >= 10, {
          message:
            'Motivo da alteração deve ter no mínimo 10 caracteres (sem contar espaços)',
        }),
    })
  }
  return residentSchema
}

export type ResidentFormData = z.infer<typeof residentSchema>
