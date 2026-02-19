import type { Resident } from '@/api/residents.api'
import {
  formatCPF,
  formatCNS,
  formatRG,
  formatPhone,
  formatCEP,
  formatDate,
  formatDateTime,
  calculateAge,
  translateEnum,
  formatBedFromResident
} from '@/utils/formatters'

import ResidentDocumentSection from './ResidentDocumentSection'
import ResidentDocumentSectionTitle from './ResidentDocumentSectionTitle'
import { PhotoViewer } from '@/components/form/PhotoViewer'
import { InstitutionalHeader } from '@/components/print/InstitutionalHeader'
import { SignatureFooter } from '@/components/print/SignatureFooter'

interface ResidentData extends Omit<Resident, 'allergies' | 'documents' | 'emergencyContacts' | 'healthPlans'> {
  photo?: { url: string; uploadedAt: string } | null
  documents?: string[] | null
  addressDocuments?: string[] | null
  emergencyContacts?: Array<{
    name: string
    phone: string
    relationship: string
  }> | null
  legalGuardianDocuments?: string[] | null
  healthPlans?: Array<{
    name: string
    cardNumber?: string | null
    cardUrl?: string | null
  }> | null
  medicalReport?: Array<{ url: string; date: string }> | null
  belongings?: string[] | null
  // Campos de saúde - agora vêm das novas tabelas via ResidentPrintView
  bloodType?: string
  height?: number | string
  weight?: number | string
  dependencyLevel?: Resident['dependencyLevel']
  mobilityAid?: boolean
  // Alergias (estrutura diferente do Resident base)
  allergies?: Array<{ substance: string; [key: string]: unknown }> | null
  // Acomodação - objetos expandidos vindos do backend
  bed?: { id: string; code: string; status?: string }
  room?: { id: string; name: string; code?: string }
  floor?: { id: string; name: string; code?: string }
  building?: { id: string; name: string; code?: string }
}

interface ResidentDocumentProps {
  resident: ResidentData
  isPrinting?: boolean
}

export default function ResidentDocument({ resident, isPrinting = false }: ResidentDocumentProps) {

  const translateBloodType = (bloodType?: string) => {
    if (!bloodType || bloodType === 'NAO_INFORMADO') return ''
    const map: Record<string, string> = {
      'A_POSITIVO': 'A+',
      'A_NEGATIVO': 'A-',
      'B_POSITIVO': 'B+',
      'B_NEGATIVO': 'B-',
      'AB_POSITIVO': 'AB+',
      'AB_NEGATIVO': 'AB-',
      'O_POSITIVO': 'O+',
      'O_NEGATIVO': 'O-'
    }
    return map[bloodType] || bloodType
  }

  const renderDocumentLink = (url: string | null | undefined, label: string) => {
    if (!url) return null
    if (isPrinting) return <p className="text-sm">{label}</p>
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-info underline text-sm">
        {label}
      </a>
    )
  }

  return (
    <div className="print-container text-foreground leading-relaxed">
      {/* Cabeçalho Institucional */}
      <InstitutionalHeader
        documentTitle="REGISTRO DE RESIDENTE"
        documentSubtitle={
          <div className="space-y-1">
            <p className="text-sm">
              <strong>Residente:</strong> {resident.fullName}
            </p>
            {resident.cpf && (
              <p className="text-sm">
                <strong>CPF:</strong> {formatCPF(resident.cpf)}
              </p>
            )}
            {resident.birthDate && (
              <p className="text-sm">
                <strong>Data de Nascimento:</strong> {formatDate(resident.birthDate)} ({calculateAge(resident.birthDate)})
              </p>
            )}
          </div>
        }
      />

      {/* ============================================================
          FOTO + DADOS DE IDENTIFICAÇÃO
      =============================================================== */}
      <section className="mb-8 print-avoid-break">
        <div className="flex gap-6 items-start">
          {/* FOTO (formato circular) */}
          {resident.fotoUrl ? (
            <div className="w-[140px] h-[140px] border-2 border-border rounded-full bg-muted/30 overflow-hidden print:shadow-none flex-shrink-0">
              <PhotoViewer
                photoUrl={resident.fotoUrl}
                altText={resident.fullName}
                size="lg"
                rounded
                className="!w-full !h-full"
              />
            </div>
          ) : (
            <div className="w-[140px] h-[140px] bg-muted/30 border-2 border-border rounded-full flex items-center justify-center text-muted-foreground text-xs print:shadow-none flex-shrink-0">
              FOTO
            </div>
          )}

          {/* Dados de Identificação */}
          <div className="flex-1 text-sm">
            {resident.socialName && (
              <p className="mb-2"><strong>Nome Social:</strong> {resident.socialName}</p>
            )}
            <p className="mb-2"><strong>CNS:</strong> {formatCNS(resident.cns) || 'Não informado'}</p>
            {resident.rg && (
              <p className="mb-2"><strong>RG:</strong> {formatRG(resident.rg, resident.rgIssuer)}</p>
            )}
            {resident.currentPhone && (
              <p className="mb-2"><strong>Telefone:</strong> {formatPhone(resident.currentPhone)}</p>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================
          DADOS PESSOAIS
      =============================================================== */}
      <ResidentDocumentSection>
        <ResidentDocumentSectionTitle>Dados Pessoais</ResidentDocumentSectionTitle>

        <p><strong>Escolaridade:</strong> {translateEnum.escolaridade(resident.education) || 'Não informado'}</p>
        <p><strong>Profissão:</strong> {resident.profession || 'Não informado'}</p>
        <p><strong>Gênero:</strong> {translateEnum.gender(resident.gender) || 'Não informado'}</p>
        <p><strong>Estado civil:</strong> {translateEnum.estadoCivil(resident.civilStatus) || 'Não informado'}</p>
        <p><strong>Religião:</strong> {resident.religion || 'Não informado'}</p>
        <p><strong>Nacionalidade:</strong> {resident.nationality || 'Brasileira'}</p>
        <p>
          <strong>Local de nascimento:</strong>{' '}
          {resident.birthCity ? `${resident.birthCity}${resident.birthState ? `/${resident.birthState}` : ''}` : 'Não informado'}
        </p>
        <p><strong>Filiação Materna:</strong> {resident.motherName || 'Não informado'}</p>
        <p><strong>Filiação Paterna:</strong> {resident.fatherName || 'Não informado'}</p>
      </ResidentDocumentSection>

      {/* ============================================================
          ENDEREÇOS
      =============================================================== */}
      <ResidentDocumentSection>
        <ResidentDocumentSectionTitle>Endereços</ResidentDocumentSectionTitle>

        <p className="font-semibold mt-3">Endereço Atual</p>
        <p>
          {resident.currentStreet || ''}{resident.currentNumber ? `, ${resident.currentNumber}` : ''}
          {resident.currentComplement ? ` – ${resident.currentComplement}` : ''}
          {resident.currentDistrict ? ` – ${resident.currentDistrict}` : ''}
        </p>
        <p>
          {resident.currentCity || ''}{resident.currentState ? `/${resident.currentState}` : ''}
          {resident.currentCep ? ` – CEP ${formatCEP(resident.currentCep)}` : ''}
        </p>
        <p>{resident.currentPhone ? `Telefone: ${formatPhone(resident.currentPhone)}` : ''}</p>

        <p className="font-semibold mt-6">Endereço de Procedência</p>
        <p>
          {resident.originStreet || ''}{resident.originNumber ? `, ${resident.originNumber}` : ''}
          {resident.originComplement ? ` – ${resident.originComplement}` : ''}
          {resident.originDistrict ? ` – ${resident.originDistrict}` : ''}
        </p>
        <p>
          {resident.originCity || ''}{resident.originState ? `/${resident.originState}` : ''}
          {resident.originCep ? ` – CEP ${formatCEP(resident.originCep)}` : ''}
        </p>
        <p>{resident.originPhone ? `Telefone: ${formatPhone(resident.originPhone)}` : ''}</p>
      </ResidentDocumentSection>

      {/* ============================================================
          CONTATOS DE EMERGÊNCIA
      =============================================================== */}
      <ResidentDocumentSection>
        <ResidentDocumentSectionTitle>Contatos de Emergência</ResidentDocumentSectionTitle>

        {resident.emergencyContacts?.length ? (
          resident.emergencyContacts.map((c, i) => (
            <p key={i} className="mb-2">
              <strong>{c.name}</strong>
              {c.relationship ? ` (${c.relationship})` : ''}
              {c.phone ? ` – Tel. ${formatPhone(c.phone)}` : ''}
            </p>
          ))
        ) : (
          <p></p>
        )}
      </ResidentDocumentSection>

      {/* ============================================================
          RESPONSÁVEL LEGAL
      =============================================================== */}
      <ResidentDocumentSection>
        <ResidentDocumentSectionTitle>Responsável Legal</ResidentDocumentSectionTitle>

        <p><strong>Nome:</strong> {resident.legalGuardianName || ''}</p>
        <p><strong>CPF:</strong> {resident.legalGuardianCpf ? formatCPF(resident.legalGuardianCpf) : ''}</p>
        <p><strong>RG:</strong> {resident.legalGuardianRg || ''}</p>
        <p><strong>Tipo:</strong> {resident.legalGuardianType ? translateEnum.tipoResponsavel(resident.legalGuardianType) : ''}</p>
        <p><strong>Telefone:</strong> {resident.legalGuardianPhone ? formatPhone(resident.legalGuardianPhone) : ''}</p>

        <p className="mt-4">
          <strong>Endereço:</strong><br />
          {resident.legalGuardianStreet || ''}
          {resident.legalGuardianNumber ? `, ${resident.legalGuardianNumber}` : ''}
          {resident.legalGuardianComplement ? ` – ${resident.legalGuardianComplement}` : ''}
          {resident.legalGuardianDistrict ? ` – ${resident.legalGuardianDistrict}` : ''}
          <br />
          {resident.legalGuardianCity || ''}{resident.legalGuardianState ? `/${resident.legalGuardianState}` : ''}
          {resident.legalGuardianCep ? ` – CEP ${formatCEP(resident.legalGuardianCep)}` : ''}
        </p>
      </ResidentDocumentSection>

      {/* ============================================================
          ADMISSÃO
      =============================================================== */}
      <ResidentDocumentSection>
        <ResidentDocumentSectionTitle>Admissão e Desligamento</ResidentDocumentSectionTitle>

        <p><strong>Data de admissão:</strong> {resident.admissionDate ? formatDate(resident.admissionDate) : ''}</p>
        <p><strong>Tipo:</strong> {resident.admissionType ? translateEnum.tipoAdmissao(resident.admissionType) : ''}</p>
        <p><strong>Motivo:</strong> {resident.admissionReason || ''}</p>
        <p><strong>Condições:</strong> {resident.admissionConditions || ''}</p>

        <p className="mt-4"><strong>Data de desligamento:</strong> {resident.dischargeDate ? formatDate(resident.dischargeDate) : ''}</p>
        <p><strong>Motivo do desligamento:</strong> {resident.dischargeReason || ''}</p>
      </ResidentDocumentSection>

      {/* ============================================================
          SAÚDE
      =============================================================== */}
      <ResidentDocumentSection>
        <ResidentDocumentSectionTitle>Saúde</ResidentDocumentSectionTitle>

        <p><strong>Necessidades especiais:</strong> {resident.specialNeeds || ''}</p>
        <p><strong>Restrições alimentares:</strong> {resident.dietaryRestrictions || ''}</p>
        <p><strong>Aspectos funcionais:</strong> {resident.functionalAspects || ''}</p>
        <p><strong>Auxílio de mobilidade:</strong> {resident.mobilityAid ? 'Sim' : ''}</p>

        <p className="mt-4">
          <strong>Dados Clínicos:</strong><br />
          {resident.bloodType ? `Tipo sanguíneo: ${translateBloodType(resident.bloodType)}` : ''}
          {resident.height ? ` | Altura: ${resident.height}m` : ''}
          {resident.weight ? ` | Peso: ${resident.weight}kg` : ''}
          {resident.dependencyLevel ? ` | Grau de dependência: ${resident.dependencyLevel}` : ''}
        </p>

        <p>{resident.healthStatus ? `Situação de Saúde: ${resident.healthStatus}` : ''}</p>
        {resident.allergies && Array.isArray(resident.allergies) && resident.allergies.length > 0 && (
          <p>
            Alergias: {resident.allergies.map((a: { substance: string; [key: string]: unknown }) => a.substance).join(', ')}
          </p>
        )}
        <p>{resident.chronicConditions ? `Condições crônicas: ${resident.chronicConditions}` : ''}</p>

        {resident.medicalReport?.length ? (
          <div className="mt-3">
            {resident.medicalReport.map((r, i) => (
              <p key={i}>{renderDocumentLink(r.url, `Laudo médico – ${formatDate(r.date)}`)}</p>
            ))}
          </div>
        ) : null}
      </ResidentDocumentSection>

      {/* ============================================================
          PLANOS DE SAÚDE
      =============================================================== */}
      <ResidentDocumentSection>
        <ResidentDocumentSectionTitle>Convênios / Planos de Saúde</ResidentDocumentSectionTitle>

        {resident.healthPlans?.length ? (
          resident.healthPlans.map((p, i) => (
            <p key={i} className="mb-2">
              <strong>{p.name}</strong>
              {p.cardNumber ? ` – Cartão: ${p.cardNumber}` : ''}
              {p.cardUrl && (
                <span className="ml-2">
                  {renderDocumentLink(p.cardUrl, 'Ver cartão')}
                </span>
              )}
            </p>
          ))
        ) : (
          <p></p>
        )}
      </ResidentDocumentSection>

      {/* ============================================================
          PERTENCES
      =============================================================== */}
      <ResidentDocumentSection>
        <ResidentDocumentSectionTitle>Pertences</ResidentDocumentSectionTitle>

        {resident.belongings?.length ? (
          <ul className="list-disc pl-6">
            {resident.belongings.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        ) : (
          <p></p>
        )}
      </ResidentDocumentSection>

      {/* ============================================================
          ACOMODAÇÃO
      =============================================================== */}
      <ResidentDocumentSection>
        <ResidentDocumentSectionTitle>Acomodação</ResidentDocumentSectionTitle>

        {resident.bed ? (
          <p>
            <strong>Leito:</strong> {formatBedFromResident(resident)}
            {resident.building && <span> • <strong>Prédio:</strong> {resident.building.name}</span>}
            {resident.floor && <span> • <strong>Andar:</strong> {resident.floor.name}</span>}
            {resident.room && <span> • <strong>Quarto:</strong> {resident.room.name}</span>}
          </p>
        ) : (
          <p>Sem acomodação definida</p>
        )}
      </ResidentDocumentSection>

      {/* ============================================================
          DOCUMENTOS ANEXADOS
      =============================================================== */}
      <ResidentDocumentSection>
        <ResidentDocumentSectionTitle>Documentos Anexados</ResidentDocumentSectionTitle>

        {resident.documents?.length ? (
          resident.documents.map((d, i) => (
            <p key={i}>{renderDocumentLink(d, `Documento pessoal ${i + 1}`)}</p>
          ))
        ) : (
          <p></p>
        )}

        {resident.addressDocuments?.length ? (
          resident.addressDocuments.map((d, i) => (
            <p key={i}>{renderDocumentLink(d, `Comprovante de endereço ${i + 1}`)}</p>
          ))
        ) : null}

        {resident.legalGuardianDocuments?.length ? (
          resident.legalGuardianDocuments.map((d, i) => (
            <p key={i}>{renderDocumentLink(d, `Documento do responsável ${i + 1}`)}</p>
          ))
        ) : null}
      </ResidentDocumentSection>

      {/* ============================================================
          OBSERVAÇÕES GERAIS (se necessário)
      =============================================================== */}
      <div className="mt-8 text-xs text-muted-foreground">
        <p><strong>Observação:</strong> Este documento contém informações confidenciais do residente e deve ser mantido em sigilo conforme a Lei Geral de Proteção de Dados (LGPD).</p>
        {resident.updatedAt && (
          <p className="mt-2">Última atualização do cadastro: {formatDateTime(resident.updatedAt)}</p>
        )}
      </div>

      {/* Rodapé com Assinatura */}
      <SignatureFooter
        signatureTitle="RESPONSÁVEL TÉCNICO"
        includeDate={true}
      />
    </div>
  )
}
