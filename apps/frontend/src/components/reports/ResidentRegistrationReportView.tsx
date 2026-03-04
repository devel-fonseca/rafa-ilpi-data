import type { Resident } from '@/api/residents.api'
import type { ResidentDocument } from '@/api/resident-documents.api'
import { RESIDENT_DOCUMENT_TYPES } from '@/api/resident-documents.api'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  calculateAge,
  formatAddress,
  formatBedFromResident,
  formatCNS,
  formatCPF,
  formatDate,
  formatDateTime,
  formatPhone,
  formatRG,
  translateEnum,
} from '@/utils/formatters'
import { FileText, Home, Shield, UserRound, Users } from 'lucide-react'

interface ResidentRegistrationReportViewProps {
  resident: Resident
  documents?: ResidentDocument[]
}

interface DocumentOrderRule {
  type: string
  label: string
  indicateMissing: boolean
}

interface DocumentDisplayRow {
  key: string
  typeLabel: string
  details: string | null
  createdAt: string | null
  isMissing: boolean
}

const DOCUMENT_TYPE_LABELS = Object.fromEntries(
  RESIDENT_DOCUMENT_TYPES.map((item) => [item.value, item.label]),
) as Record<string, string>

const DOCUMENT_ORDER_RULES: DocumentOrderRule[] = [
  { type: 'TERMO_ADMISSAO', label: 'Termo de admissão do residente', indicateMissing: true },
  {
    type: 'TERMO_CONSENTIMENTO_IMAGEM',
    label: 'Termo de consentimento de imagem',
    indicateMissing: true,
  },
  {
    type: 'TERMO_CONSENTIMENTO_LGPD',
    label: 'Termo de consentimento LGPD',
    indicateMissing: true,
  },
  {
    type: 'DOCUMENTOS_PESSOAIS',
    label: 'Documentos pessoais do residente',
    indicateMissing: true,
  },
  {
    type: 'COMPROVANTE_RESIDENCIA_RESIDENTE',
    label: 'Comprovante de residência do residente',
    indicateMissing: false,
  },
  {
    type: 'DOCUMENTOS_RESPONSAVEL_LEGAL',
    label: 'Documentos do responsável legal',
    indicateMissing: true,
  },
  {
    type: 'COMPROVANTE_RESIDENCIA_RESPONSAVEL',
    label: 'Comprovante de residência do responsável legal',
    indicateMissing: false,
  },
  { type: 'CARTAO_CONVENIO', label: 'Cartão do convênio', indicateMissing: false },
  { type: 'LAUDO_MEDICO', label: 'Laudo médico do residente', indicateMissing: true },
  { type: 'PRESCRICAO_MEDICA', label: 'Prescrição médica', indicateMissing: false },
  { type: 'COMPROVANTE_VACINACAO', label: 'Comprovante de vacinação', indicateMissing: false },
]

function valueOrDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function getDocumentTypeLabel(type: string): string {
  return DOCUMENT_TYPE_LABELS[type] || type
}

function buildOrderedDocumentRows(documents: ResidentDocument[]): DocumentDisplayRow[] {
  const sortedByDateDesc = [...documents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const rows: DocumentDisplayRow[] = []
  const consumedIds = new Set<string>()

  DOCUMENT_ORDER_RULES.forEach((rule) => {
    const docsOfType = sortedByDateDesc.filter((doc) => doc.type === rule.type)

    if (docsOfType.length === 0) {
      if (rule.indicateMissing) {
        rows.push({
          key: `missing-${rule.type}`,
          typeLabel: rule.label,
          details: null,
          createdAt: null,
          isMissing: true,
        })
      }
      return
    }

    docsOfType.forEach((doc) => {
      consumedIds.add(doc.id)
      rows.push({
        key: doc.id,
        typeLabel: rule.label,
        details: doc.details,
        createdAt: doc.createdAt,
        isMissing: false,
      })
    })
  })

  const otherDocuments = sortedByDateDesc
    .filter((doc) => !consumedIds.has(doc.id))
    .sort((a, b) => {
      const typeDiff = getDocumentTypeLabel(a.type).localeCompare(getDocumentTypeLabel(b.type), 'pt-BR')
      if (typeDiff !== 0) return typeDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  otherDocuments.forEach((doc) => {
    rows.push({
      key: doc.id,
      typeLabel: `Outros documentos (${getDocumentTypeLabel(doc.type)})`,
      details: doc.details,
      createdAt: doc.createdAt,
      isMissing: false,
    })
  })

  return rows
}

export function ResidentRegistrationReportView({
  resident,
  documents = [],
}: ResidentRegistrationReportViewProps) {
  const currentAddress = formatAddress(
    resident.currentStreet,
    resident.currentNumber,
    resident.currentComplement,
    resident.currentDistrict,
    resident.currentCity,
    resident.currentState,
    resident.currentCep,
  )
  const documentRows = buildOrderedDocumentRows(documents)
  const hasDischargeDate = Boolean(resident.dischargeDate)
  const hasDischargeReason = Boolean(resident.dischargeReason?.trim())

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Ficha Cadastral do Residente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Nome completo</p>
              <p className="text-base font-semibold">{resident.fullName}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Data de nascimento</p>
              <p className="text-base font-semibold">{formatDate(resident.birthDate)}</p>
              <p className="text-xs text-muted-foreground">{calculateAge(resident.birthDate)}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Status cadastral</p>
              <div className="mt-1">
                <Badge variant="outline">{valueOrDash(resident.status)}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserRound className="h-5 w-5" />
            1. Identificação e Dados Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Nome social</p>
              <p>{valueOrDash(resident.socialName)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">CPF</p>
              <p>{formatCPF(resident.cpf)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">CNS</p>
              <p>{formatCNS(resident.cns)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">RG</p>
              <p>{formatRG(resident.rg, resident.rgIssuer)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gênero</p>
              <p>{translateEnum.gender(resident.gender)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estado civil</p>
              <p>{translateEnum.estadoCivil(resident.civilStatus)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Escolaridade</p>
              <p>{translateEnum.escolaridade(resident.education)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Profissão</p>
              <p>{valueOrDash(resident.profession)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Religião</p>
              <p>{valueOrDash(resident.religion)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nacionalidade</p>
              <p>{valueOrDash(resident.nationality)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Local de nascimento</p>
              <p>
                {valueOrDash(
                  [resident.birthCity, resident.birthState]
                    .filter((part) => Boolean(part && part.trim()))
                    .join('/'),
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nome da mãe</p>
              <p>{valueOrDash(resident.motherName)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nome do pai</p>
              <p>{valueOrDash(resident.fatherName)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            2. Contatos de Emergência
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resident.emergencyContacts && resident.emergencyContacts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Parentesco</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resident.emergencyContacts.map((contact, index) => (
                  <TableRow key={`${contact.name}-${index}`}>
                    <TableCell>{valueOrDash(contact.name)}</TableCell>
                    <TableCell>{formatPhone(contact.phone)}</TableCell>
                    <TableCell>{valueOrDash(contact.relationship)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum contato de emergência cadastrado.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Home className="h-5 w-5" />
            3. Endereço e Procedência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">Endereço atual</p>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{currentAddress}</p>
              <p className="text-sm">
                <span className="text-muted-foreground">E-mail: </span>
                {valueOrDash(resident.email)}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Telefone: </span>
                {formatPhone(resident.currentPhone)}
              </p>
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">Procedência</p>
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {valueOrDash(resident.origin)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            4. Responsável Legal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Nome</p>
              <p>{valueOrDash(resident.legalGuardianName)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tipo de responsabilidade</p>
              <p>{valueOrDash(resident.legalGuardianType)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">CPF</p>
              <p>{formatCPF(resident.legalGuardianCpf)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">RG</p>
              <p>{formatRG(resident.legalGuardianRg)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">E-mail</p>
              <p>{valueOrDash(resident.legalGuardianEmail)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Telefone</p>
              <p>{formatPhone(resident.legalGuardianPhone)}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-muted-foreground">Endereço</p>
              <p className="whitespace-pre-line">
                {formatAddress(
                  resident.legalGuardianStreet,
                  resident.legalGuardianNumber,
                  resident.legalGuardianComplement,
                  resident.legalGuardianDistrict,
                  resident.legalGuardianCity,
                  resident.legalGuardianState,
                  resident.legalGuardianCep,
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            5. Convênios e Planos de Saúde
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resident.healthPlans && resident.healthPlans.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Convênio</TableHead>
                  <TableHead>Número da carteirinha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resident.healthPlans.map((plan, index) => (
                  <TableRow key={`${plan.name}-${index}`}>
                    <TableCell>{valueOrDash(plan.name)}</TableCell>
                    <TableCell>{valueOrDash(plan.cardNumber)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum convênio cadastrado.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            6. Admissão e Acomodação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Data de admissão</p>
              <p>{formatDate(resident.admissionDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tipo de admissão</p>
              <p>{valueOrDash(resident.admissionType)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Motivo da admissão</p>
              <p>{valueOrDash(resident.admissionReason)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Condições da admissão</p>
              <p>{valueOrDash(resident.admissionConditions)}</p>
            </div>
            {hasDischargeDate && (
              <div>
                <p className="text-xs text-muted-foreground">Data de desligamento</p>
                <p>{formatDate(resident.dischargeDate)}</p>
              </div>
            )}
            {hasDischargeReason && (
              <div>
                <p className="text-xs text-muted-foreground">Motivo do desligamento</p>
                <p>{valueOrDash(resident.dischargeReason)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Leito</p>
              <p>{formatBedFromResident(resident)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            7. Documentos do Cadastro
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documentRows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Detalhes</TableHead>
                  <TableHead>Data de envio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentRows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.typeLabel}</TableCell>
                    <TableCell>{valueOrDash(row.details)}</TableCell>
                    <TableCell className={row.isMissing ? 'text-warning font-medium' : ''}>
                      {row.createdAt ? formatDateTime(row.createdAt) : 'Ausente'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum documento anexado ao cadastro.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
