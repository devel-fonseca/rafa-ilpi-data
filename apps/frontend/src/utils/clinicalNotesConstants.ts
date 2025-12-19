import type { ClinicalProfession } from '@/api/clinicalNotes.api'

// ==================== PROFISSÕES ====================

export interface ProfessionConfig {
  label: string
  color: string
  bgColor: string
  borderColor: string
  icon: string
  registrationLabel?: string // Ex: "CRM-SP 123456", "COREN-SP 654321"
}

export const PROFESSION_CONFIG: Record<ClinicalProfession, ProfessionConfig> = {
  MEDICINE: {
    label: 'Medicina',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    icon: '🩺',
  },
  NURSING: {
    label: 'Enfermagem',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-500/10 dark:bg-green-500/20',
    borderColor: 'border-green-500/30',
    icon: '💉',
  },
  NUTRITION: {
    label: 'Nutrição',
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-500/10 dark:bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    icon: '🥗',
  },
  PHYSIOTHERAPY: {
    label: 'Fisioterapia',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-500/10 dark:bg-purple-500/20',
    borderColor: 'border-purple-500/30',
    icon: '🤸',
  },
  PSYCHOLOGY: {
    label: 'Psicologia',
    color: 'text-pink-700 dark:text-pink-300',
    bgColor: 'bg-pink-500/10 dark:bg-pink-500/20',
    borderColor: 'border-pink-500/30',
    icon: '🧠',
  },
  SOCIAL_WORK: {
    label: 'Serviço Social',
    color: 'text-cyan-700 dark:text-cyan-300',
    bgColor: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    borderColor: 'border-cyan-500/30',
    icon: '🤝',
  },
  SPEECH_THERAPY: {
    label: 'Fonoaudiologia',
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    borderColor: 'border-indigo-500/30',
    icon: '🗣️',
  },
  OCCUPATIONAL_THERAPY: {
    label: 'Terapia Ocupacional',
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-500/10 dark:bg-amber-500/20',
    borderColor: 'border-amber-500/30',
    icon: '🎨',
  },
}

/**
 * Helper para obter configuração de uma profissão
 */
export function getProfessionConfig(profession?: ClinicalProfession): ProfessionConfig {
  // Fallback para MEDICINE se profession for undefined
  if (!profession) {
    return PROFESSION_CONFIG.MEDICINE
  }
  return PROFESSION_CONFIG[profession]
}

/**
 * Helper para obter label de uma profissão
 */
export function getProfessionLabel(profession: ClinicalProfession): string {
  return PROFESSION_CONFIG[profession].label
}

/**
 * Helper para obter prefixo do registro profissional
 * Retorna o código do conselho profissional (ex: CRM, COREN, CRN, etc.)
 */
export function getRegistrationPrefix(profession: ClinicalProfession): string {
  const prefixes: Record<ClinicalProfession, string> = {
    MEDICINE: 'CRM',
    NURSING: 'COREN',
    NUTRITION: 'CRN',
    PHYSIOTHERAPY: 'CREFITO',
    PSYCHOLOGY: 'CRP',
    SOCIAL_WORK: 'CRESS',
    SPEECH_THERAPY: 'CRFa',
    OCCUPATIONAL_THERAPY: 'CREFITO',
  }
  return prefixes[profession]
}

// ==================== TAGS PRÉ-DEFINIDAS ====================

export interface TagConfig {
  value: string
  label: string
  color: string
  bgColor: string
}

export const DEFAULT_CLINICAL_TAGS: TagConfig[] = [
  {
    value: 'risco_queda',
    label: 'Risco de Queda',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-500/10 dark:bg-red-500/20',
  },
  {
    value: 'ferida',
    label: 'Ferida',
    color: 'text-rose-700 dark:text-rose-300',
    bgColor: 'bg-rose-500/10 dark:bg-rose-500/20',
  },
  {
    value: 'dor',
    label: 'Dor',
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-500/10 dark:bg-orange-500/20',
  },
  {
    value: 'nutricao',
    label: 'Nutrição',
    color: 'text-lime-700 dark:text-lime-300',
    bgColor: 'bg-lime-500/10 dark:bg-lime-500/20',
  },
  {
    value: 'infeccao',
    label: 'Infecção',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-500/10 dark:bg-red-500/20',
  },
  {
    value: 'cognicao',
    label: 'Cognição',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-500/10 dark:bg-purple-500/20',
  },
  {
    value: 'mobilidade',
    label: 'Mobilidade',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
  },
  {
    value: 'pele',
    label: 'Pele',
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-500/10 dark:bg-amber-500/20',
  },
  {
    value: 'diabetes',
    label: 'Diabetes',
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-500/10 dark:bg-indigo-500/20',
  },
  {
    value: 'hipertensao',
    label: 'Hipertensão',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-500/10 dark:bg-red-500/20',
  },
  {
    value: 'cardiopatia',
    label: 'Cardiopatia',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-500/10 dark:bg-red-500/20',
  },
  {
    value: 'respiratorio',
    label: 'Respiratório',
    color: 'text-cyan-700 dark:text-cyan-300',
    bgColor: 'bg-cyan-500/10 dark:bg-cyan-500/20',
  },
  {
    value: 'gastrointestinal',
    label: 'Gastrointestinal',
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/20',
  },
  {
    value: 'urinario',
    label: 'Urinário',
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-500/10 dark:bg-yellow-500/20',
  },
  {
    value: 'psiquiatrico',
    label: 'Psiquiátrico',
    color: 'text-fuchsia-700 dark:text-fuchsia-300',
    bgColor: 'bg-fuchsia-500/10 dark:bg-fuchsia-500/20',
  },
  {
    value: 'neurologico',
    label: 'Neurológico',
    color: 'text-violet-700 dark:text-violet-300',
    bgColor: 'bg-violet-500/10 dark:bg-violet-500/20',
  },
  {
    value: 'medicacao',
    label: 'Medicação',
    color: 'text-teal-700 dark:text-teal-300',
    bgColor: 'bg-teal-500/10 dark:bg-teal-500/20',
  },
  {
    value: 'exames',
    label: 'Exames',
    color: 'text-sky-700 dark:text-sky-300',
    bgColor: 'bg-sky-500/10 dark:bg-sky-500/20',
  },
  {
    value: 'intercorrencia',
    label: 'Intercorrência',
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-500/10 dark:bg-orange-500/20',
  },
  {
    value: 'alta',
    label: 'Alta',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-500/10 dark:bg-green-500/20',
  },
]

/**
 * Helper para obter configuração de uma tag (pré-definida ou customizada)
 */
export function getTagConfig(tagValue: string): TagConfig {
  const predefined = DEFAULT_CLINICAL_TAGS.find((t) => t.value === tagValue)

  if (predefined) {
    return predefined
  }

  // Tag customizada - usar cor padrão
  return {
    value: tagValue,
    label: tagValue,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
  }
}

/**
 * Helper para obter lista de valores das tags pré-definidas (para validação)
 */
export function getDefaultTagValues(): string[] {
  return DEFAULT_CLINICAL_TAGS.map((t) => t.value)
}

// ==================== TEMPLATES SOAP ====================

export interface SOAPTemplate {
  profession: ClinicalProfession
  subjective: {
    label: string
    placeholder: string
    guide: string[]
  }
  objective: {
    label: string
    placeholder: string
    guide: string[]
  }
  assessment: {
    label: string
    placeholder: string
    guide: string[]
  }
  plan: {
    label: string
    placeholder: string
    guide: string[]
  }
}

/**
 * Templates orientativos por profissão
 * Guias são sugestões de tópicos a serem abordados em cada campo
 */
export const SOAP_TEMPLATES: Record<ClinicalProfession, SOAPTemplate> = {
  MEDICINE: {
    profession: 'MEDICINE',
    subjective: {
      label: '[S] Subjetivo',
      placeholder: 'Queixas e relatos do residente...',
      guide: [
        'Queixas principais',
        'Sintomas relatados',
        'Histórico recente',
        'Percepção do residente/família',
      ],
    },
    objective: {
      label: '[O] Objetivo',
      placeholder: 'Achados clínicos objetivos...',
      guide: [
        'Sinais vitais',
        'Exame físico',
        'Resultados de exames',
        'Observações clínicas',
      ],
    },
    assessment: {
      label: '[A] Avaliação',
      placeholder: 'Análise e diagnóstico...',
      guide: [
        'Diagnóstico principal',
        'Diagnósticos diferenciais',
        'Análise da evolução',
        'Prognóstico',
      ],
    },
    plan: {
      label: '[P] Plano',
      placeholder: 'Condutas e planejamento...',
      guide: [
        'Prescrições médicas',
        'Exames solicitados',
        'Encaminhamentos',
        'Orientações',
      ],
    },
  },

  NURSING: {
    profession: 'NURSING',
    subjective: {
      label: '[S] Subjetivo',
      placeholder: 'Queixas e relatos do residente...',
      guide: [
        'Queixas de desconforto',
        'Relatos sobre cuidados',
        'Percepção do bem-estar',
        'Comunicação com família',
      ],
    },
    objective: {
      label: '[O] Objetivo',
      placeholder: 'Observações e dados objetivos...',
      guide: [
        'Sinais vitais',
        'Estado geral',
        'Condições da pele',
        'Hidratação e nutrição',
        'Eliminações',
        'Sono e repouso',
      ],
    },
    assessment: {
      label: '[A] Avaliação',
      placeholder: 'Diagnósticos de enfermagem...',
      guide: [
        'Diagnósticos de enfermagem',
        'Risco identificados',
        'Resposta ao plano de cuidados',
        'Necessidades prioritárias',
      ],
    },
    plan: {
      label: '[P] Plano',
      placeholder: 'Intervenções de enfermagem...',
      guide: [
        'Cuidados diretos',
        'Vigilância e monitoramento',
        'Orientações ao residente/família',
        'Encaminhamentos',
      ],
    },
  },

  NUTRITION: {
    profession: 'NUTRITION',
    subjective: {
      label: '[S] Subjetivo',
      placeholder: 'Relatos sobre alimentação e nutrição...',
      guide: [
        'Queixas alimentares',
        'Apetite e preferências',
        'Sintomas gastrointestinais',
        'Percepção da dieta',
      ],
    },
    objective: {
      label: '[O] Objetivo',
      placeholder: 'Dados antropométricos e observações...',
      guide: [
        'Peso e altura',
        'IMC',
        'Circunferências',
        'Ingestão alimentar observada',
        'Dados laboratoriais',
      ],
    },
    assessment: {
      label: '[A] Avaliação',
      placeholder: 'Diagnóstico nutricional...',
      guide: [
        'Estado nutricional',
        'Risco nutricional',
        'Diagnósticos nutricionais',
        'Avaliação da dieta atual',
      ],
    },
    plan: {
      label: '[P] Plano',
      placeholder: 'Prescrição dietética e condutas...',
      guide: [
        'Prescrição dietética',
        'Suplementação',
        'Orientações nutricionais',
        'Reavaliação programada',
      ],
    },
  },

  PHYSIOTHERAPY: {
    profession: 'PHYSIOTHERAPY',
    subjective: {
      label: '[S] Subjetivo',
      placeholder: 'Queixas e percepções do residente...',
      guide: [
        'Queixas álgicas',
        'Limitações percebidas',
        'Disposição para atividades',
        'Percepção da mobilidade',
      ],
    },
    objective: {
      label: '[O] Objetivo',
      placeholder: 'Avaliação funcional e motora...',
      guide: [
        'Amplitude de movimento',
        'Força muscular',
        'Equilíbrio e coordenação',
        'Marcha e transferências',
        'Postura',
      ],
    },
    assessment: {
      label: '[A] Avaliação',
      placeholder: 'Diagnóstico fisioterapêutico...',
      guide: [
        'Diagnóstico cinético-funcional',
        'Potencial de reabilitação',
        'Riscos identificados',
        'Resposta ao tratamento',
      ],
    },
    plan: {
      label: '[P] Plano',
      placeholder: 'Condutas fisioterapêuticas...',
      guide: [
        'Técnicas e recursos utilizados',
        'Exercícios prescritos',
        'Frequência e duração',
        'Orientações e adaptações',
      ],
    },
  },

  PSYCHOLOGY: {
    profession: 'PSYCHOLOGY',
    subjective: {
      label: '[S] Subjetivo',
      placeholder: 'Relatos e expressões emocionais...',
      guide: [
        'Queixas emocionais',
        'Relatos sobre humor',
        'Percepção de si e do ambiente',
        'Relações interpessoais',
      ],
    },
    objective: {
      label: '[O] Objetivo',
      placeholder: 'Observações comportamentais...',
      guide: [
        'Estado mental observado',
        'Comportamento durante atendimento',
        'Expressões não-verbais',
        'Interação social',
      ],
    },
    assessment: {
      label: '[A] Avaliação',
      placeholder: 'Análise psicológica...',
      guide: [
        'Avaliação cognitiva',
        'Avaliação emocional',
        'Recursos psicológicos',
        'Demandas identificadas',
      ],
    },
    plan: {
      label: '[P] Plano',
      placeholder: 'Intervenções psicológicas...',
      guide: [
        'Estratégias terapêuticas',
        'Orientações psicológicas',
        'Encaminhamentos',
        'Acompanhamento proposto',
      ],
    },
  },

  SOCIAL_WORK: {
    profession: 'SOCIAL_WORK',
    subjective: {
      label: '[S] Subjetivo',
      placeholder: 'Relatos sobre aspectos sociais...',
      guide: [
        'Demandas sociais relatadas',
        'Relatos sobre família',
        'Percepção de direitos',
        'Expectativas e preocupações',
      ],
    },
    objective: {
      label: '[O] Objetivo',
      placeholder: 'Situação social observada...',
      guide: [
        'Condições socioeconômicas',
        'Rede de apoio',
        'Benefícios ativos',
        'Documentação',
      ],
    },
    assessment: {
      label: '[A] Avaliação',
      placeholder: 'Análise social...',
      guide: [
        'Vulnerabilidades sociais',
        'Potencialidades',
        'Direitos a serem garantidos',
        'Necessidades prioritárias',
      ],
    },
    plan: {
      label: '[P] Plano',
      placeholder: 'Ações e encaminhamentos sociais...',
      guide: [
        'Encaminhamentos realizados',
        'Orientações sobre direitos',
        'Articulação com rede',
        'Acompanhamento proposto',
      ],
    },
  },

  SPEECH_THERAPY: {
    profession: 'SPEECH_THERAPY',
    subjective: {
      label: '[S] Subjetivo',
      placeholder: 'Queixas relacionadas à comunicação e deglutição...',
      guide: [
        'Queixas de comunicação',
        'Queixas de deglutição',
        'Percepção da fala',
        'Percepção da audição',
      ],
    },
    objective: {
      label: '[O] Objetivo',
      placeholder: 'Avaliação fonoaudiológica...',
      guide: [
        'Avaliação da fala e linguagem',
        'Avaliação da deglutição',
        'Avaliação da voz',
        'Audição',
      ],
    },
    assessment: {
      label: '[A] Avaliação',
      placeholder: 'Diagnóstico fonoaudiológico...',
      guide: [
        'Diagnóstico fonoaudiológico',
        'Grau de comprometimento',
        'Risco de aspiração',
        'Potencial terapêutico',
      ],
    },
    plan: {
      label: '[P] Plano',
      placeholder: 'Condutas fonoaudiológicas...',
      guide: [
        'Terapia fonoaudiológica',
        'Orientações de comunicação',
        'Manejo da disfagia',
        'Frequência de atendimento',
      ],
    },
  },

  OCCUPATIONAL_THERAPY: {
    profession: 'OCCUPATIONAL_THERAPY',
    subjective: {
      label: '[S] Subjetivo',
      placeholder: 'Relatos sobre atividades diárias...',
      guide: [
        'Queixas sobre AVDs',
        'Percepção de autonomia',
        'Interesses e atividades',
        'Relatos sobre participação',
      ],
    },
    objective: {
      label: '[O] Objetivo',
      placeholder: 'Avaliação do desempenho ocupacional...',
      guide: [
        'Desempenho em AVDs',
        'Habilidades motoras',
        'Habilidades cognitivas',
        'Ambiente e adaptações',
      ],
    },
    assessment: {
      label: '[A] Avaliação',
      placeholder: 'Diagnóstico terapêutico ocupacional...',
      guide: [
        'Diagnóstico terapêutico ocupacional',
        'Potencial de reabilitação',
        'Barreiras identificadas',
        'Recursos disponíveis',
      ],
    },
    plan: {
      label: '[P] Plano',
      placeholder: 'Intervenções terapêuticas ocupacionais...',
      guide: [
        'Atividades terapêuticas',
        'Tecnologia assistiva',
        'Adaptações ambientais',
        'Orientações ao residente/cuidadores',
      ],
    },
  },
}

/**
 * Helper para obter template SOAP de uma profissão
 */
export function getSOAPTemplate(profession?: ClinicalProfession): SOAPTemplate {
  // Fallback para MEDICINE se profession for undefined
  if (!profession) {
    return SOAP_TEMPLATES.MEDICINE
  }
  return SOAP_TEMPLATES[profession]
}
