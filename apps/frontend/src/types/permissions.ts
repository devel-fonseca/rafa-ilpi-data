export enum PositionCode {
  ADMINISTRATOR = 'ADMINISTRATOR',
  TECHNICAL_MANAGER = 'TECHNICAL_MANAGER',
  NURSING_COORDINATOR = 'NURSING_COORDINATOR',
  NURSE = 'NURSE',
  NURSING_TECHNICIAN = 'NURSING_TECHNICIAN',
  NURSING_ASSISTANT = 'NURSING_ASSISTANT',
  DOCTOR = 'DOCTOR',
  PSYCHOLOGIST = 'PSYCHOLOGIST',
  SOCIAL_WORKER = 'SOCIAL_WORKER',
  PHYSIOTHERAPIST = 'PHYSIOTHERAPIST',
  NUTRITIONIST = 'NUTRITIONIST',
  SPEECH_THERAPIST = 'SPEECH_THERAPIST',
  OCCUPATIONAL_THERAPIST = 'OCCUPATIONAL_THERAPIST',
  CAREGIVER = 'CAREGIVER',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  ADMINISTRATIVE_ASSISTANT = 'ADMINISTRATIVE_ASSISTANT',
  OTHER = 'OTHER',
}

export enum RegistrationType {
  COREN = 'COREN',
  CRM = 'CRM',
  CRP = 'CRP',
  CRESS = 'CRESS',
  CREFITO = 'CREFITO',
  CRN = 'CRN',
  CREFONO = 'CREFONO',
  NONE = 'NONE',
}

export enum PermissionType {
  // Residents
  VIEW_RESIDENTS = 'VIEW_RESIDENTS',
  CREATE_RESIDENTS = 'CREATE_RESIDENTS',
  UPDATE_RESIDENTS = 'UPDATE_RESIDENTS',
  DELETE_RESIDENTS = 'DELETE_RESIDENTS',
  EXPORT_RESIDENTS = 'EXPORT_RESIDENTS',

  // Daily Records
  VIEW_DAILY_RECORDS = 'VIEW_DAILY_RECORDS',
  CREATE_DAILY_RECORDS = 'CREATE_DAILY_RECORDS',
  UPDATE_DAILY_RECORDS = 'UPDATE_DAILY_RECORDS',
  DELETE_DAILY_RECORDS = 'DELETE_DAILY_RECORDS',
  EXPORT_DAILY_RECORDS = 'EXPORT_DAILY_RECORDS',

  // Prescriptions
  VIEW_PRESCRIPTIONS = 'VIEW_PRESCRIPTIONS',
  CREATE_PRESCRIPTIONS = 'CREATE_PRESCRIPTIONS',
  UPDATE_PRESCRIPTIONS = 'UPDATE_PRESCRIPTIONS',
  DELETE_PRESCRIPTIONS = 'DELETE_PRESCRIPTIONS',

  // Medications Administration
  VIEW_MEDICATIONS = 'VIEW_MEDICATIONS',
  ADMINISTER_MEDICATIONS = 'ADMINISTER_MEDICATIONS',
  ADMINISTER_CONTROLLED_MEDICATIONS = 'ADMINISTER_CONTROLLED_MEDICATIONS',

  // Vaccinations
  VIEW_VACCINATIONS = 'VIEW_VACCINATIONS',
  CREATE_VACCINATIONS = 'CREATE_VACCINATIONS',
  UPDATE_VACCINATIONS = 'UPDATE_VACCINATIONS',
  DELETE_VACCINATIONS = 'DELETE_VACCINATIONS',

  // Vital Signs
  VIEW_VITAL_SIGNS = 'VIEW_VITAL_SIGNS',
  CREATE_VITAL_SIGNS = 'CREATE_VITAL_SIGNS',
  RECORD_VITAL_SIGNS = 'RECORD_VITAL_SIGNS',

  // Clinical Notes (SOAP)
  VIEW_CLINICAL_NOTES = 'VIEW_CLINICAL_NOTES',
  CREATE_CLINICAL_NOTES = 'CREATE_CLINICAL_NOTES',
  UPDATE_CLINICAL_NOTES = 'UPDATE_CLINICAL_NOTES',
  DELETE_CLINICAL_NOTES = 'DELETE_CLINICAL_NOTES',

  // Clinical Profile
  VIEW_CLINICAL_PROFILE = 'VIEW_CLINICAL_PROFILE',
  CREATE_CLINICAL_PROFILE = 'CREATE_CLINICAL_PROFILE',
  UPDATE_CLINICAL_PROFILE = 'UPDATE_CLINICAL_PROFILE',

  // Allergies
  VIEW_ALLERGIES = 'VIEW_ALLERGIES',
  CREATE_ALLERGIES = 'CREATE_ALLERGIES',
  UPDATE_ALLERGIES = 'UPDATE_ALLERGIES',
  DELETE_ALLERGIES = 'DELETE_ALLERGIES',

  // Chronic Conditions
  VIEW_CONDITIONS = 'VIEW_CONDITIONS',
  CREATE_CONDITIONS = 'CREATE_CONDITIONS',
  UPDATE_CONDITIONS = 'UPDATE_CONDITIONS',
  DELETE_CONDITIONS = 'DELETE_CONDITIONS',

  // Dietary Restrictions
  VIEW_DIETARY_RESTRICTIONS = 'VIEW_DIETARY_RESTRICTIONS',
  CREATE_DIETARY_RESTRICTIONS = 'CREATE_DIETARY_RESTRICTIONS',
  UPDATE_DIETARY_RESTRICTIONS = 'UPDATE_DIETARY_RESTRICTIONS',
  DELETE_DIETARY_RESTRICTIONS = 'DELETE_DIETARY_RESTRICTIONS',

  // Documents
  VIEW_DOCUMENTS = 'VIEW_DOCUMENTS',
  CREATE_DOCUMENTS = 'CREATE_DOCUMENTS',
  UPDATE_DOCUMENTS = 'UPDATE_DOCUMENTS',
  DELETE_DOCUMENTS = 'DELETE_DOCUMENTS',

  // Infrastructure
  MANAGE_BUILDINGS = 'MANAGE_BUILDINGS',
  MANAGE_FLOORS = 'MANAGE_FLOORS',
  MANAGE_ROOMS = 'MANAGE_ROOMS',
  MANAGE_BEDS = 'MANAGE_BEDS',

  // Users & Permissions
  MANAGE_USERS = 'MANAGE_USERS',
  MANAGE_PERMISSIONS = 'MANAGE_PERMISSIONS',

  // Institutional Profile
  VIEW_INSTITUTIONAL_PROFILE = 'VIEW_INSTITUTIONAL_PROFILE',
  UPDATE_INSTITUTIONAL_PROFILE = 'UPDATE_INSTITUTIONAL_PROFILE',

  // POPs (Procedimentos Operacionais Padrão)
  VIEW_POPS = 'VIEW_POPS',
  CREATE_POPS = 'CREATE_POPS',
  UPDATE_POPS = 'UPDATE_POPS',
  DELETE_POPS = 'DELETE_POPS',
  PUBLISH_POPS = 'PUBLISH_POPS',
  MANAGE_POPS = 'MANAGE_POPS',

  // Contratos de Prestação de Serviços
  VIEW_CONTRACTS = 'VIEW_CONTRACTS',
  CREATE_CONTRACTS = 'CREATE_CONTRACTS',
  UPDATE_CONTRACTS = 'UPDATE_CONTRACTS',
  REPLACE_CONTRACTS = 'REPLACE_CONTRACTS',
  DELETE_CONTRACTS = 'DELETE_CONTRACTS',
  VALIDATE_CONTRACTS = 'VALIDATE_CONTRACTS',

  // Agenda do Residente
  VIEW_RESIDENT_SCHEDULE = 'VIEW_RESIDENT_SCHEDULE',
  MANAGE_RESIDENT_SCHEDULE = 'MANAGE_RESIDENT_SCHEDULE',

  // Belongings (Pertences de Residentes)
  VIEW_BELONGINGS = 'VIEW_BELONGINGS',
  MANAGE_BELONGINGS = 'MANAGE_BELONGINGS',

  // Reports and Audit
  VIEW_REPORTS = 'VIEW_REPORTS',
  EXPORT_DATA = 'EXPORT_DATA',
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',

  // Conformidade RDC 502/2021 (acesso restrito a gestores)
  VIEW_COMPLIANCE_DASHBOARD = 'VIEW_COMPLIANCE_DASHBOARD',
  MANAGE_COMPLIANCE_ASSESSMENT = 'MANAGE_COMPLIANCE_ASSESSMENT',
  VIEW_SENTINEL_EVENTS = 'VIEW_SENTINEL_EVENTS',

  // Escalas e Plantões (Gestão de Turnos e Equipes)
  VIEW_CARE_SHIFTS = 'VIEW_CARE_SHIFTS',
  CREATE_CARE_SHIFTS = 'CREATE_CARE_SHIFTS',
  UPDATE_CARE_SHIFTS = 'UPDATE_CARE_SHIFTS',
  DELETE_CARE_SHIFTS = 'DELETE_CARE_SHIFTS',
  MANAGE_TEAMS = 'MANAGE_TEAMS',
  VIEW_RDC_COMPLIANCE = 'VIEW_RDC_COMPLIANCE',
  CONFIGURE_SHIFT_SETTINGS = 'CONFIGURE_SHIFT_SETTINGS',
}

export const POSITION_CODE_LABELS: Record<PositionCode, string> = {
  [PositionCode.ADMINISTRATOR]: 'Administrador',
  [PositionCode.TECHNICAL_MANAGER]: 'Responsável Técnico',
  [PositionCode.NURSING_COORDINATOR]: 'Coordenador de Enfermagem',
  [PositionCode.NURSE]: 'Enfermeiro(a)',
  [PositionCode.NURSING_TECHNICIAN]: 'Técnico de Enfermagem',
  [PositionCode.NURSING_ASSISTANT]: 'Auxiliar de Enfermagem',
  [PositionCode.DOCTOR]: 'Médico(a)',
  [PositionCode.PSYCHOLOGIST]: 'Psicólogo(a)',
  [PositionCode.SOCIAL_WORKER]: 'Assistente Social',
  [PositionCode.PHYSIOTHERAPIST]: 'Fisioterapeuta',
  [PositionCode.NUTRITIONIST]: 'Nutricionista',
  [PositionCode.SPEECH_THERAPIST]: 'Fonoaudiólogo(a)',
  [PositionCode.OCCUPATIONAL_THERAPIST]: 'Terapeuta Ocupacional',
  [PositionCode.CAREGIVER]: 'Cuidador(a)',
  [PositionCode.ADMINISTRATIVE]: 'Administrativo',
  [PositionCode.ADMINISTRATIVE_ASSISTANT]: 'Assistente Administrativo',
  [PositionCode.OTHER]: 'Outro',
};

export const POSITION_CODE_DESCRIPTIONS: Record<PositionCode, string> = {
  [PositionCode.ADMINISTRATOR]: 'Acesso total ao sistema, gestão de usuários e configurações',
  [PositionCode.TECHNICAL_MANAGER]: 'Responsável técnico da ILPI, supervisão geral das atividades',
  [PositionCode.NURSING_COORDINATOR]: 'Coordenação da equipe de enfermagem e cuidados',
  [PositionCode.NURSE]: 'Enfermeiro responsável por prescrições, procedimentos e supervisão',
  [PositionCode.NURSING_TECHNICIAN]: 'Técnico de enfermagem com permissões para cuidados e medicações',
  [PositionCode.NURSING_ASSISTANT]: 'Auxiliar de enfermagem com permissões básicas de cuidados',
  [PositionCode.DOCTOR]: 'Médico com permissões para prescrições e diagnósticos',
  [PositionCode.PSYCHOLOGIST]: 'Psicólogo com acesso a avaliações e acompanhamentos',
  [PositionCode.SOCIAL_WORKER]: 'Assistente social com acesso a dados sociais e documentação',
  [PositionCode.PHYSIOTHERAPIST]: 'Fisioterapeuta com acesso a planos de tratamento',
  [PositionCode.NUTRITIONIST]: 'Nutricionista com acesso a planos alimentares e dietas',
  [PositionCode.SPEECH_THERAPIST]: 'Fonoaudiólogo com acesso a avaliações e terapias de fala',
  [PositionCode.OCCUPATIONAL_THERAPIST]: 'Terapeuta ocupacional com acesso a atividades terapêuticas e reabilitação',
  [PositionCode.CAREGIVER]: 'Cuidador com permissões básicas de registro de atividades',
  [PositionCode.ADMINISTRATIVE]: 'Administrativo com acesso a gestão e relatórios',
  [PositionCode.ADMINISTRATIVE_ASSISTANT]: 'Assistente administrativo com acesso limitado a tarefas administrativas',
  [PositionCode.OTHER]: 'Outro profissional com permissões customizadas',
};

export const REGISTRATION_TYPE_LABELS: Record<RegistrationType, string> = {
  [RegistrationType.COREN]: 'COREN (Enfermagem)',
  [RegistrationType.CRM]: 'CRM (Medicina)',
  [RegistrationType.CRP]: 'CRP (Psicologia)',
  [RegistrationType.CRESS]: 'CRESS (Serviço Social)',
  [RegistrationType.CREFITO]: 'CREFITO (Fisioterapia)',
  [RegistrationType.CRN]: 'CRN (Nutrição)',
  [RegistrationType.CREFONO]: 'CREFONO (Fonoaudiologia)',
  [RegistrationType.NONE]: 'Sem Registro',
};

export const PERMISSION_LABELS: Record<PermissionType, string> = {
  [PermissionType.VIEW_RESIDENTS]: 'Visualizar residentes',
  [PermissionType.CREATE_RESIDENTS]: 'Cadastrar residentes',
  [PermissionType.UPDATE_RESIDENTS]: 'Editar residentes',
  [PermissionType.DELETE_RESIDENTS]: 'Remover residentes',
  [PermissionType.EXPORT_RESIDENTS]: 'Exportar dados de residentes',

  [PermissionType.VIEW_DAILY_RECORDS]: 'Visualizar registros diários',
  [PermissionType.CREATE_DAILY_RECORDS]: 'Criar registros diários',
  [PermissionType.UPDATE_DAILY_RECORDS]: 'Editar registros diários',
  [PermissionType.DELETE_DAILY_RECORDS]: 'Excluir registros diários',
  [PermissionType.EXPORT_DAILY_RECORDS]: 'Exportar registros diários',

  [PermissionType.VIEW_PRESCRIPTIONS]: 'Visualizar prescrições',
  [PermissionType.CREATE_PRESCRIPTIONS]: 'Criar prescrições',
  [PermissionType.UPDATE_PRESCRIPTIONS]: 'Editar prescrições',
  [PermissionType.DELETE_PRESCRIPTIONS]: 'Excluir prescrições',

  [PermissionType.VIEW_MEDICATIONS]: 'Visualizar medicações',
  [PermissionType.ADMINISTER_MEDICATIONS]: 'Administrar medicações',
  [PermissionType.ADMINISTER_CONTROLLED_MEDICATIONS]: 'Administrar medicações controladas',

  [PermissionType.VIEW_VACCINATIONS]: 'Visualizar vacinações',
  [PermissionType.CREATE_VACCINATIONS]: 'Registrar vacinações',
  [PermissionType.UPDATE_VACCINATIONS]: 'Editar vacinações',
  [PermissionType.DELETE_VACCINATIONS]: 'Excluir vacinações',

  [PermissionType.VIEW_VITAL_SIGNS]: 'Visualizar sinais vitais',
  [PermissionType.CREATE_VITAL_SIGNS]: 'Registrar sinais vitais',
  [PermissionType.RECORD_VITAL_SIGNS]: 'Registrar sinais vitais',

  [PermissionType.VIEW_CLINICAL_NOTES]: 'Visualizar evoluções clínicas',
  [PermissionType.CREATE_CLINICAL_NOTES]: 'Criar evoluções clínicas',
  [PermissionType.UPDATE_CLINICAL_NOTES]: 'Editar evoluções clínicas',
  [PermissionType.DELETE_CLINICAL_NOTES]: 'Excluir evoluções clínicas',

  [PermissionType.VIEW_CLINICAL_PROFILE]: 'Visualizar perfil clínico',
  [PermissionType.CREATE_CLINICAL_PROFILE]: 'Criar perfil clínico',
  [PermissionType.UPDATE_CLINICAL_PROFILE]: 'Editar perfil clínico',

  [PermissionType.VIEW_ALLERGIES]: 'Visualizar alergias',
  [PermissionType.CREATE_ALLERGIES]: 'Cadastrar alergias',
  [PermissionType.UPDATE_ALLERGIES]: 'Editar alergias',
  [PermissionType.DELETE_ALLERGIES]: 'Excluir alergias',

  [PermissionType.VIEW_CONDITIONS]: 'Visualizar condições crônicas',
  [PermissionType.CREATE_CONDITIONS]: 'Cadastrar condições crônicas',
  [PermissionType.UPDATE_CONDITIONS]: 'Editar condições crônicas',
  [PermissionType.DELETE_CONDITIONS]: 'Excluir condições crônicas',

  [PermissionType.VIEW_DIETARY_RESTRICTIONS]: 'Visualizar restrições alimentares',
  [PermissionType.CREATE_DIETARY_RESTRICTIONS]: 'Cadastrar restrições alimentares',
  [PermissionType.UPDATE_DIETARY_RESTRICTIONS]: 'Editar restrições alimentares',
  [PermissionType.DELETE_DIETARY_RESTRICTIONS]: 'Excluir restrições alimentares',

  [PermissionType.VIEW_DOCUMENTS]: 'Visualizar documentos',
  [PermissionType.CREATE_DOCUMENTS]: 'Upload de documentos',
  [PermissionType.UPDATE_DOCUMENTS]: 'Editar documentos',
  [PermissionType.DELETE_DOCUMENTS]: 'Excluir documentos',

  [PermissionType.MANAGE_BUILDINGS]: 'Gerenciar prédios',
  [PermissionType.MANAGE_FLOORS]: 'Gerenciar andares',
  [PermissionType.MANAGE_ROOMS]: 'Gerenciar quartos',
  [PermissionType.MANAGE_BEDS]: 'Gerenciar leitos',

  [PermissionType.MANAGE_USERS]: 'Gerenciar usuários',
  [PermissionType.MANAGE_PERMISSIONS]: 'Gerenciar permissões',

  [PermissionType.VIEW_INSTITUTIONAL_PROFILE]: 'Visualizar perfil institucional',
  [PermissionType.UPDATE_INSTITUTIONAL_PROFILE]: 'Editar perfil institucional',

  [PermissionType.VIEW_POPS]: 'Visualizar POPs',
  [PermissionType.CREATE_POPS]: 'Criar POPs',
  [PermissionType.UPDATE_POPS]: 'Editar POPs',
  [PermissionType.DELETE_POPS]: 'Excluir POPs',
  [PermissionType.PUBLISH_POPS]: 'Publicar POPs',
  [PermissionType.MANAGE_POPS]: 'Gerenciar POPs',

  [PermissionType.VIEW_CONTRACTS]: 'Visualizar contratos',
  [PermissionType.CREATE_CONTRACTS]: 'Cadastrar contratos',
  [PermissionType.UPDATE_CONTRACTS]: 'Editar contratos',
  [PermissionType.REPLACE_CONTRACTS]: 'Substituir arquivo do contrato',
  [PermissionType.DELETE_CONTRACTS]: 'Excluir contratos',
  [PermissionType.VALIDATE_CONTRACTS]: 'Validar autenticidade de contratos',

  [PermissionType.VIEW_RESIDENT_SCHEDULE]: 'Visualizar agenda do residente',
  [PermissionType.MANAGE_RESIDENT_SCHEDULE]: 'Gerenciar agenda do residente',

  [PermissionType.VIEW_BELONGINGS]: 'Visualizar pertences',
  [PermissionType.MANAGE_BELONGINGS]: 'Gerenciar pertences',

  [PermissionType.VIEW_REPORTS]: 'Visualizar relatórios',
  [PermissionType.EXPORT_DATA]: 'Exportar dados',
  [PermissionType.VIEW_AUDIT_LOGS]: 'Visualizar logs de auditoria',

  [PermissionType.VIEW_COMPLIANCE_DASHBOARD]: 'Visualizar dashboard de conformidade RDC',
  [PermissionType.MANAGE_COMPLIANCE_ASSESSMENT]: 'Gerenciar autodiagnósticos RDC 502/2021',
  [PermissionType.VIEW_SENTINEL_EVENTS]: 'Visualizar e gerenciar eventos sentinela',

  [PermissionType.VIEW_CARE_SHIFTS]: 'Visualizar plantões',
  [PermissionType.CREATE_CARE_SHIFTS]: 'Criar plantões',
  [PermissionType.UPDATE_CARE_SHIFTS]: 'Editar plantões',
  [PermissionType.DELETE_CARE_SHIFTS]: 'Excluir plantões',
  [PermissionType.MANAGE_TEAMS]: 'Gerenciar equipes',
  [PermissionType.VIEW_RDC_COMPLIANCE]: 'Visualizar conformidade RDC',
  [PermissionType.CONFIGURE_SHIFT_SETTINGS]: 'Configurar turnos',
};

export const PERMISSION_GROUPS = {
  residents: {
    label: 'Residentes',
    permissions: [
      PermissionType.VIEW_RESIDENTS,
      PermissionType.CREATE_RESIDENTS,
      PermissionType.UPDATE_RESIDENTS,
      PermissionType.DELETE_RESIDENTS,
      PermissionType.EXPORT_RESIDENTS,
    ],
  },
  dailyRecords: {
    label: 'Registros Diários',
    permissions: [
      PermissionType.VIEW_DAILY_RECORDS,
      PermissionType.CREATE_DAILY_RECORDS,
      PermissionType.UPDATE_DAILY_RECORDS,
      PermissionType.DELETE_DAILY_RECORDS,
      PermissionType.EXPORT_DAILY_RECORDS,
    ],
  },
  prescriptions: {
    label: 'Prescrições',
    permissions: [
      PermissionType.VIEW_PRESCRIPTIONS,
      PermissionType.CREATE_PRESCRIPTIONS,
      PermissionType.UPDATE_PRESCRIPTIONS,
      PermissionType.DELETE_PRESCRIPTIONS,
    ],
  },
  medications: {
    label: 'Administração de Medicamentos',
    permissions: [
      PermissionType.VIEW_MEDICATIONS,
      PermissionType.ADMINISTER_MEDICATIONS,
      PermissionType.ADMINISTER_CONTROLLED_MEDICATIONS,
    ],
  },
  vaccinations: {
    label: 'Vacinações',
    permissions: [
      PermissionType.VIEW_VACCINATIONS,
      PermissionType.CREATE_VACCINATIONS,
      PermissionType.UPDATE_VACCINATIONS,
      PermissionType.DELETE_VACCINATIONS,
    ],
  },
  vitalSigns: {
    label: 'Sinais Vitais',
    permissions: [PermissionType.VIEW_VITAL_SIGNS, PermissionType.CREATE_VITAL_SIGNS],
  },
  documents: {
    label: 'Documentos',
    permissions: [
      PermissionType.VIEW_DOCUMENTS,
      PermissionType.CREATE_DOCUMENTS,
      PermissionType.UPDATE_DOCUMENTS,
      PermissionType.DELETE_DOCUMENTS,
    ],
  },
  infrastructure: {
    label: 'Infraestrutura',
    permissions: [
      PermissionType.MANAGE_BUILDINGS,
      PermissionType.MANAGE_FLOORS,
      PermissionType.MANAGE_ROOMS,
      PermissionType.MANAGE_BEDS,
    ],
  },
  pops: {
    label: 'POPs',
    permissions: [
      PermissionType.VIEW_POPS,
      PermissionType.CREATE_POPS,
      PermissionType.UPDATE_POPS,
      PermissionType.DELETE_POPS,
      PermissionType.PUBLISH_POPS,
      PermissionType.MANAGE_POPS,
    ],
  },
  contracts: {
    label: 'Contratos de Prestação de Serviços',
    permissions: [
      PermissionType.VIEW_CONTRACTS,
      PermissionType.CREATE_CONTRACTS,
      PermissionType.UPDATE_CONTRACTS,
      PermissionType.REPLACE_CONTRACTS,
      PermissionType.DELETE_CONTRACTS,
      PermissionType.VALIDATE_CONTRACTS,
    ],
  },
  residentSchedule: {
    label: 'Agenda do Residente',
    permissions: [
      PermissionType.VIEW_RESIDENT_SCHEDULE,
      PermissionType.MANAGE_RESIDENT_SCHEDULE,
    ],
  },
  belongings: {
    label: 'Pertences de Residentes',
    permissions: [
      PermissionType.VIEW_BELONGINGS,
      PermissionType.MANAGE_BELONGINGS,
    ],
  },
  reports: {
    label: 'Relatórios',
    permissions: [
      PermissionType.VIEW_REPORTS,
      PermissionType.EXPORT_DATA,
    ],
  },
  administration: {
    label: 'Administração',
    permissions: [
      PermissionType.MANAGE_USERS,
      PermissionType.MANAGE_PERMISSIONS,
      PermissionType.VIEW_INSTITUTIONAL_PROFILE,
      PermissionType.UPDATE_INSTITUTIONAL_PROFILE,
      PermissionType.VIEW_AUDIT_LOGS,
    ],
  },
  compliance: {
    label: 'Conformidade RDC 502/2021',
    permissions: [
      PermissionType.VIEW_COMPLIANCE_DASHBOARD,
      PermissionType.MANAGE_COMPLIANCE_ASSESSMENT,
      PermissionType.VIEW_SENTINEL_EVENTS,
    ],
  },
  careShifts: {
    label: 'Escalas e Plantões',
    permissions: [
      PermissionType.VIEW_CARE_SHIFTS,
      PermissionType.CREATE_CARE_SHIFTS,
      PermissionType.UPDATE_CARE_SHIFTS,
      PermissionType.DELETE_CARE_SHIFTS,
      PermissionType.MANAGE_TEAMS,
      PermissionType.VIEW_RDC_COMPLIANCE,
      PermissionType.CONFIGURE_SHIFT_SETTINGS,
    ],
  },
};
