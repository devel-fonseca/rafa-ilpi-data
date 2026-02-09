// ============================================================================
// TIPOS COMPARTILHADOS PARA DAILY RECORDS
// ============================================================================
// Este arquivo centraliza as interfaces de dados para os registros diários,
// evitando tipagem fraca (Record<string, unknown>) nos componentes.

// ============================================================================
// ENUMS E TIPOS BASE
// ============================================================================

export type RecordType =
  | 'ALIMENTACAO'
  | 'HIGIENE'
  | 'ELIMINACAO'
  | 'HIDRATACAO'
  | 'SONO'
  | 'HUMOR'
  | 'ATIVIDADES'
  | 'COMPORTAMENTO'
  | 'INTERCORRENCIA'
  | 'MONITORAMENTO'
  | 'OBSERVACAO'
  | 'OUTROS'
  | 'PESO'
  | 'VISITA'

/**
 * Tipos de registros que podem ser programados na rotina do residente.
 * Exclui INTERCORRENCIA e OBSERVACAO (eventos não programáveis por natureza).
 */
export type SchedulableRecordType =
  | 'ALIMENTACAO'
  | 'HIGIENE'
  | 'ELIMINACAO'
  | 'HIDRATACAO'
  | 'SONO'
  | 'HUMOR'
  | 'ATIVIDADES'
  | 'COMPORTAMENTO'
  | 'MONITORAMENTO'
  | 'PESO'

// ============================================================================
// DADOS ESPECÍFICOS POR TIPO DE REGISTRO
// ============================================================================

// --- ALIMENTAÇÃO ---
export interface AlimentacaoData {
  refeicao?: 'Café da Manhã' | 'Colação' | 'Almoço' | 'Lanche' | 'Jantar' | 'Ceia' | 'Colação Extra'
  cardapio?: string
  consistencia?: 'Geral' | 'Pastosa' | 'Líquida' | 'Triturada'
  ingeriu?: '100%' | '75%' | '50%' | '<25%' | 'Recusou'
  auxilioNecessario?: boolean
  volumeMl?: string | number
  intercorrencia?: 'Engasgo' | 'Náusea' | 'Vômito' | 'Recusa' | 'Nenhuma'
}

// --- HIGIENE ---
export interface HigieneData {
  tipoBanho?: 'Sem banho' | 'Chuveiro' | 'Leito' | 'Aspersão'
  duracao?: string
  condicaoPele?: string
  localAlteracao?: string
  hidratanteAplicado?: boolean
  higieneBucal?: boolean
  trocaFralda?: boolean
  quantidadeFraldas?: string | number
  observacoes?: string
}

// --- ELIMINAÇÃO ---
export interface EliminacaoData {
  tipo?: 'Urina' | 'Fezes'
  consistencia?: string
  cor?: string
  volume?: string
  odor?: string
  trocaFralda?: boolean
  observacoes?: string
}

// --- HIDRATAÇÃO ---
export interface HidratacaoData {
  volumeMl?: number | string
  tipo?: string
  tipoLiquido?: string
  aceitacao?: string
  observacoes?: string
}

// --- SONO ---
export interface SonoData {
  padraoSono?: string
  outroPadrao?: string
  qualidade?: 'Bom' | 'Regular' | 'Ruim' | 'Insônia'
  horasDormidas?: string | number
  acordouDuranteNoite?: boolean
  vezesAcordou?: number
  observacoes?: string
}

// --- HUMOR ---
export interface HumorData {
  humor?: string
  outroHumor?: string
  observacoes?: string
}

// --- ATIVIDADES ---
export interface AtividadesData {
  tipoAtividade?: string
  atividade?: string
  participacao?: string
  observacoes?: string
}

// --- COMPORTAMENTO ---
export interface ComportamentoData {
  descricao?: string
}

// --- INTERCORRÊNCIA ---
export interface IntercorrenciaData {
  tipo?: string
  descricao?: string
  providenciaTomada?: string
  acaoTomada?: string
  observacoes?: string
}

// --- MONITORAMENTO (Sinais Vitais) ---
export interface MonitoramentoData {
  pressaoArterial?: string
  frequenciaCardiaca?: string | number
  temperatura?: string | number
  saturacaoO2?: string | number
  glicemia?: string | number
}

// --- OBSERVAÇÃO ---
export interface ObservacaoData {
  observacao?: string
  descricao?: string
}

// --- PESO ---
export interface PesoData {
  peso?: number | string
  altura?: number | string
  imc?: number
  observacoes?: string
}

// --- VISITA ---
export interface VisitaData {
  visitante?: string
  observacoes?: string
}

// --- OUTROS ---
export interface OutrosData {
  descricao?: string
  observacoes?: string
}

// ============================================================================
// TIPO UNION PARA TODOS OS DADOS
// ============================================================================

export type DailyRecordData =
  | AlimentacaoData
  | HigieneData
  | EliminacaoData
  | HidratacaoData
  | SonoData
  | HumorData
  | AtividadesData
  | ComportamentoData
  | IntercorrenciaData
  | MonitoramentoData
  | ObservacaoData
  | OutrosData
  | PesoData
  | VisitaData

// ============================================================================
// INTERFACE BASE PARA REGISTROS
// ============================================================================

export interface BaseDailyRecord<T = DailyRecordData> {
  id?: string
  residentId?: string
  type?: RecordType
  date: string
  time: string
  data: T
  notes?: string
  recordedBy?: string
  createdAt?: string
  updatedAt?: string
}

// ============================================================================
// INTERFACES ESPECÍFICAS POR TIPO DE REGISTRO
// ============================================================================

export interface AlimentacaoRecord extends BaseDailyRecord<AlimentacaoData> {
  type?: 'ALIMENTACAO'
}

export interface HigieneRecord extends BaseDailyRecord<HigieneData> {
  type?: 'HIGIENE'
}

export interface EliminacaoRecord extends BaseDailyRecord<EliminacaoData> {
  type?: 'ELIMINACAO'
}

export interface HidratacaoRecord extends BaseDailyRecord<HidratacaoData> {
  type?: 'HIDRATACAO'
}

export interface SonoRecord extends BaseDailyRecord<SonoData> {
  type?: 'SONO'
}

export interface HumorRecord extends BaseDailyRecord<HumorData> {
  type?: 'HUMOR'
}

export interface AtividadesRecord extends BaseDailyRecord<AtividadesData> {
  type?: 'ATIVIDADES'
}

export interface ComportamentoRecord extends BaseDailyRecord<ComportamentoData> {
  type?: 'COMPORTAMENTO'
}

export interface IntercorrenciaRecord extends BaseDailyRecord<IntercorrenciaData> {
  type?: 'INTERCORRENCIA'
}

export interface MonitoramentoRecord extends BaseDailyRecord<MonitoramentoData> {
  type?: 'MONITORAMENTO'
}

export interface ObservacaoRecord extends BaseDailyRecord<ObservacaoData> {
  type?: 'OBSERVACAO'
}

export interface PesoRecord extends BaseDailyRecord<PesoData> {
  type?: 'PESO'
}

export interface VisitaRecord extends BaseDailyRecord<VisitaData> {
  type?: 'VISITA'
}

export interface OutrosRecord extends BaseDailyRecord<OutrosData> {
  type?: 'OUTROS'
}

// ============================================================================
// TIPO UNION PARA QUALQUER REGISTRO
// ============================================================================

export type DailyRecord =
  | AlimentacaoRecord
  | HigieneRecord
  | EliminacaoRecord
  | HidratacaoRecord
  | SonoRecord
  | HumorRecord
  | AtividadesRecord
  | ComportamentoRecord
  | IntercorrenciaRecord
  | MonitoramentoRecord
  | ObservacaoRecord
  | OutrosRecord
  | PesoRecord
  | VisitaRecord

// ============================================================================
// INPUTS PARA CRIAÇÃO DE REGISTROS
// ============================================================================

/**
 * Input genérico para criação de registro diário.
 * Usado pelos modais de criação para enviar dados ao backend.
 */
export interface CreateDailyRecordInput<T = DailyRecordData> {
  residentId: string
  type: RecordType | string
  date: string
  time: string
  recordedBy: string
  data: T
  notes?: string
  // Campos específicos para INTERCORRENCIA
  incidentCategory?: string
  incidentSubtypeClinical?: string
  incidentSubtypeAssist?: string
  incidentSubtypeAdmin?: string
  incidentSeverity?: string
  isEventoSentinela?: boolean
  isDoencaNotificavel?: boolean
  rdcIndicators?: string[]
}
