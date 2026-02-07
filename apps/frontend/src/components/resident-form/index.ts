// ──────────────────────────────────────────────────────────────────────────────
//  EXPORTS - Componentes do Formulário de Residente
// ──────────────────────────────────────────────────────────────────────────────

export { FormSidebar, type FormSection } from './FormSidebar'
export { IdentificacaoSection } from './IdentificacaoSection'
export { ContatosSection } from './ContatosSection'
export { EnderecoSection } from './EnderecoSection'
export { ResponsavelSection } from './ResponsavelSection'
export { ConveniosSection } from './ConveniosSection'
export { AdmissaoSection } from './AdmissaoSection'
export { DocumentosSection } from './DocumentosSection'
export {
  residentSchema,
  getResidentSchema,
  type ResidentFormData,
  type CpfValidation,
  type CnsValidation,
} from './types'
