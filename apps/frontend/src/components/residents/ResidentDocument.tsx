import { useState, useEffect } from 'react'
import { User } from 'lucide-react'
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
  valueOrDash
} from '@/utils/formatters'
import { getSignedFileUrl } from '@/services/upload'

// Usar a interface Resident do backend com alguns campos opcionais adicionais
interface ResidentData extends Resident {
  // Campos extras que podem vir do backend ou serem adicionados
  photo?: {
    url: string
    uploadedAt: string
  } | null
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
  medicalReport?: Array<{
    url: string
    date: string
  }> | null
  belongings?: string[] | null
}

interface TenantData {
  name: string
  address: string
  addressNumber: string
  addressDistrict: string
  addressCity: string
  addressState: string
  addressZipCode: string
  cnpj: string
  phone: string
}

interface ResidentDocumentProps {
  resident: ResidentData
  tenant: TenantData
  isPrinting?: boolean
}

export function ResidentDocument({ resident, tenant, isPrinting = false }: ResidentDocumentProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  // Carregar URL assinada da foto (conformidade LGPD)
  useEffect(() => {
    const loadPhotoUrl = async () => {
      if (resident.fotoUrl) {
        try {
          const signedUrl = await getSignedFileUrl(resident.fotoUrl)
          setPhotoUrl(signedUrl)
        } catch (error) {
          console.error('Erro ao carregar foto:', error)
          setPhotoUrl(null)
        }
      }
    }
    loadPhotoUrl()
  }, [resident.fotoUrl])

  // Traduzir tipo sanguíneo
  const translateBloodType = (bloodType?: string) => {
    if (!bloodType || bloodType === 'NAO_INFORMADO') return 'Não informado'
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

    if (isPrinting) {
      // No modo de impressão/PDF, apenas texto
      return (
        <div className="text-sm text-gray-700 mb-1">
          📄 {label}
        </div>
      )
    }

    // No modo de visualização, link clicável
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 hover:text-blue-800 underline mb-1 block"
      >
        📄 {label}
      </a>
    )
  }

  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto print:p-0 shadow-lg border border-gray-200">
      {/* Cabeçalho Timbrado */}
      <div className="border-4 border-double border-gray-800 p-4 mb-6">
        <div className="border-b-2 border-gray-600 pb-3 mb-3 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 uppercase">{tenant.name}</h1>
          <p className="text-sm text-gray-700 font-medium">
            {tenant.address}, {tenant.addressNumber} - {tenant.addressDistrict} - {tenant.addressCity}/{tenant.addressState} - CEP: {formatCEP(tenant.addressZipCode)}
          </p>
          <p className="text-sm text-gray-700">
            CNPJ: <span className="font-semibold">{tenant.cnpj}</span> | Telefone: <span className="font-semibold">{formatPhone(tenant.phone)}</span>
          </p>
        </div>

        {/* Título do Documento */}
        <div className="text-center py-2">
          <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
            Registro de Residente
          </h2>
        </div>
      </div>

      {/* Seção Topo: Foto + Dados Principais */}
      <div className="flex gap-6 mb-8 border-b pb-6">
        {/* Foto */}
        <div className="flex-shrink-0">
          <div className="w-[140px] h-[180px] border-2 border-gray-300 rounded overflow-hidden bg-gray-50 flex items-center justify-center">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={resident.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-16 h-16 text-gray-400" />
            )}
          </div>
        </div>

        {/* Dados Principais */}
        <div className="flex-1">
          <div className="grid grid-cols-[150px_1fr] gap-x-4 gap-y-2">
            <div className="font-semibold text-gray-700">Nome:</div>
            <div className="text-gray-900 uppercase font-bold">{resident.fullName}</div>

            {resident.socialName && (
              <>
                <div className="font-semibold text-gray-700">Nome Social:</div>
                <div className="text-gray-900">{resident.socialName}</div>
              </>
            )}

            <div className="font-semibold text-gray-700">Data de Nascimento:</div>
            <div className="text-gray-900">
              {formatDate(resident.birthDate)}
              <br />
              <span className="text-sm text-gray-600">{calculateAge(resident.birthDate)}</span>
            </div>

            <div className="font-semibold text-gray-700">CNS:</div>
            <div className="text-gray-900">{formatCNS(resident.cns)}</div>

            <div className="font-semibold text-gray-700">CPF:</div>
            <div className="text-gray-900">{formatCPF(resident.cpf)}</div>
          </div>
        </div>
      </div>

      {/* DADOS PESSOAIS */}
      <section className="mb-6 border-l-2 border-gray-800 pl-4">
        <h3 className="text-lg font-bold text-gray-900 border-b-2 border-gray-800 pb-2 mb-3 uppercase tracking-wide">
          Dados Pessoais
        </h3>
        <div className="grid grid-cols-[180px_1fr] gap-x-4 gap-y-2 text-sm">
          <div className="font-semibold text-gray-700">RG:</div>
          <div className="text-gray-900">{formatRG(resident.rg, resident.rgIssuer)}</div>

          <div className="font-semibold text-gray-700">Órgão Expedidor:</div>
          <div className="text-gray-900">{valueOrDash(resident.rgIssuer)}</div>

          <div className="font-semibold text-gray-700">Escolaridade:</div>
          <div className="text-gray-900">{translateEnum.escolaridade(resident.education)}</div>

          <div className="font-semibold text-gray-700">Profissão:</div>
          <div className="text-gray-900">{valueOrDash(resident.profession)}</div>

          <div className="font-semibold text-gray-700">Gênero:</div>
          <div className="text-gray-900">{translateEnum.gender(resident.gender)}</div>

          <div className="font-semibold text-gray-700">Estado Civil:</div>
          <div className="text-gray-900">{translateEnum.estadoCivil(resident.civilStatus)}</div>

          <div className="font-semibold text-gray-700">Religião:</div>
          <div className="text-gray-900">{valueOrDash(resident.religion)}</div>

          <div className="font-semibold text-gray-700">Nacionalidade:</div>
          <div className="text-gray-900">{valueOrDash(resident.nationality)}</div>

          <div className="font-semibold text-gray-700">Local Nascimento:</div>
          <div className="text-gray-900">
            {resident.birthCity ? `${resident.birthCity}${resident.birthState ? `/${resident.birthState}` : ''}` : '-'}
          </div>

          <div className="font-semibold text-gray-700">Nome da Mãe:</div>
          <div className="text-gray-900">{valueOrDash(resident.motherName)}</div>

          <div className="font-semibold text-gray-700">Nome do Pai:</div>
          <div className="text-gray-900">{valueOrDash(resident.fatherName)}</div>
        </div>
      </section>

      {/* ENDEREÇOS */}
      <section className="mb-6 border-l-2 border-gray-800 pl-4">
        <h3 className="text-lg font-bold text-gray-900 border-b-2 border-gray-800 pb-2 mb-3 uppercase tracking-wide">
          Endereços
        </h3>

        {/* Endereço Atual */}
        {(resident.currentStreet || resident.currentCity) && (
          <div className="mb-4">
            <h4 className="font-bold text-gray-900 mb-2">Endereço Atual</h4>
            <div className="text-sm text-gray-700 pl-4">
              {resident.currentStreet && (
                <p>
                  {resident.currentStreet}
                  {resident.currentNumber && `, ${resident.currentNumber}`}
                  {resident.currentComplement && ` - ${resident.currentComplement}`}
                  {resident.currentDistrict && ` - ${resident.currentDistrict}`}
                </p>
              )}
              {resident.currentCity && (
                <p>
                  {resident.currentCity}/{resident.currentState}
                  {resident.currentCep && ` - CEP: ${formatCEP(resident.currentCep)}`}
                </p>
              )}
              {resident.currentPhone && (
                <p>Telefone: {formatPhone(resident.currentPhone)}</p>
              )}
            </div>
          </div>
        )}

        {/* Endereço de Procedência */}
        {(resident.originStreet || resident.originCity) && (
          <div>
            <h4 className="font-bold text-gray-900 mb-2">Endereço de Procedência</h4>
            <div className="text-sm text-gray-700 pl-4">
              {resident.originStreet && (
                <p>
                  {resident.originStreet}
                  {resident.originNumber && `, ${resident.originNumber}`}
                  {resident.originComplement && ` - ${resident.originComplement}`}
                  {resident.originDistrict && ` - ${resident.originDistrict}`}
                </p>
              )}
              {resident.originCity && (
                <p>
                  {resident.originCity}/{resident.originState}
                  {resident.originCep && ` - CEP: ${formatCEP(resident.originCep)}`}
                </p>
              )}
              {resident.originPhone && (
                <p>Telefone: {formatPhone(resident.originPhone)}</p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* CONTATOS DE EMERGÊNCIA */}
      {resident.emergencyContacts && resident.emergencyContacts.length > 0 && (
        <section className="mb-6 border-l-2 border-gray-800 pl-4">
          <h3 className="text-lg font-bold text-gray-900 border-b-2 border-gray-800 pb-2 mb-3 uppercase tracking-wide">
            Contatos de Emergência
          </h3>

          {resident.emergencyContacts.map((contact, index) => (
            <div key={index} className="mb-3 text-sm">
              <p className="font-bold text-gray-900">
                {index + 1}. {contact.name}
                {contact.relationship && ` (${contact.relationship})`}
              </p>
              <p className="text-gray-700 pl-4">
                Tel: {formatPhone(contact.phone)}
                {contact.relationship && ` | Parentesco: ${contact.relationship}`}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* RESPONSÁVEL LEGAL */}
      {resident.legalGuardianName && (
        <section className="mb-6 border-l-2 border-gray-800 pl-4">
          <h3 className="text-lg font-bold text-gray-900 border-b-2 border-gray-800 pb-2 mb-3 uppercase tracking-wide">
            Responsável Legal
          </h3>
          <div className="grid grid-cols-[180px_1fr] gap-x-4 gap-y-2 text-sm">
            <div className="font-semibold text-gray-700">Nome:</div>
            <div className="text-gray-900">{resident.legalGuardianName}</div>

            {resident.legalGuardianCpf && (
              <>
                <div className="font-semibold text-gray-700">CPF:</div>
                <div className="text-gray-900">{formatCPF(resident.legalGuardianCpf)}</div>
              </>
            )}

            {resident.legalGuardianRg && (
              <>
                <div className="font-semibold text-gray-700">RG:</div>
                <div className="text-gray-900">{resident.legalGuardianRg}</div>
              </>
            )}

            {resident.legalGuardianType && (
              <>
                <div className="font-semibold text-gray-700">Tipo:</div>
                <div className="text-gray-900">{translateEnum.tipoResponsavel(resident.legalGuardianType)}</div>
              </>
            )}

            {resident.legalGuardianPhone && (
              <>
                <div className="font-semibold text-gray-700">Telefone:</div>
                <div className="text-gray-900">{formatPhone(resident.legalGuardianPhone)}</div>
              </>
            )}

            {(resident.legalGuardianStreet || resident.legalGuardianCity) && (
              <>
                <div className="font-semibold text-gray-700">Endereço:</div>
                <div className="text-gray-900">
                  {resident.legalGuardianStreet}
                  {resident.legalGuardianNumber && `, ${resident.legalGuardianNumber}`}
                  {resident.legalGuardianComplement && ` - ${resident.legalGuardianComplement}`}
                  {resident.legalGuardianDistrict && ` - ${resident.legalGuardianDistrict}`}
                  {resident.legalGuardianCity && (
                    <>
                      <br />
                      {resident.legalGuardianCity}/{resident.legalGuardianState}
                      {resident.legalGuardianCep && ` - CEP: ${formatCEP(resident.legalGuardianCep)}`}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ADMISSÃO */}
      {resident.admissionDate && (
        <section className="mb-6 border-l-2 border-gray-800 pl-4">
          <h3 className="text-lg font-bold text-gray-900 border-b-2 border-gray-800 pb-2 mb-3 uppercase tracking-wide">
            Admissão e Desligamento
          </h3>
          <div className="grid grid-cols-[180px_1fr] gap-x-4 gap-y-2 text-sm">
            <div className="font-semibold text-gray-700">Data de Admissão:</div>
            <div className="text-gray-900">{formatDate(resident.admissionDate)}</div>

            {resident.admissionType && (
              <>
                <div className="font-semibold text-gray-700">Tipo:</div>
                <div className="text-gray-900">{translateEnum.tipoAdmissao(resident.admissionType)}</div>
              </>
            )}

            {resident.admissionReason && (
              <>
                <div className="font-semibold text-gray-700">Motivo:</div>
                <div className="text-gray-900">{resident.admissionReason}</div>
              </>
            )}

            {resident.admissionConditions && (
              <>
                <div className="font-semibold text-gray-700">Condições:</div>
                <div className="text-gray-900">{resident.admissionConditions}</div>
              </>
            )}

            {resident.dischargeDate && (
              <>
                <div className="font-semibold text-gray-700">Data de Desligamento:</div>
                <div className="text-gray-900">{formatDate(resident.dischargeDate)}</div>
              </>
            )}

            {resident.dischargeReason && (
              <>
                <div className="font-semibold text-gray-700">Motivo do Desligamento:</div>
                <div className="text-gray-900">{resident.dischargeReason}</div>
              </>
            )}
          </div>
        </section>
      )}

      {/* SAÚDE */}
      <section className="mb-6 border-l-2 border-gray-800 pl-4">
        <h3 className="text-lg font-bold text-gray-900 border-b-2 border-gray-800 pb-2 mb-3 uppercase tracking-wide">
          Saúde
        </h3>

        {resident.specialNeeds && (
          <div className="mb-3">
            <h4 className="font-bold text-gray-900 text-sm mb-1">Necessidades Especiais:</h4>
            <p className="text-sm text-gray-700 pl-4">{resident.specialNeeds}</p>
          </div>
        )}

        {resident.dietaryRestrictions && (
          <div className="mb-3">
            <h4 className="font-bold text-gray-900 text-sm mb-1">Restrições Alimentares:</h4>
            <p className="text-sm text-gray-700 pl-4">{resident.dietaryRestrictions}</p>
          </div>
        )}

        {resident.functionalAspects && (
          <div className="mb-3">
            <h4 className="font-bold text-gray-900 text-sm mb-1">Aspectos Funcionais:</h4>
            <p className="text-sm text-gray-700 pl-4">{resident.functionalAspects}</p>
            {resident.mobilityAid && (
              <p className="text-sm text-gray-700 pl-4">[X] Necessita auxílio para mobilidade</p>
            )}
          </div>
        )}

        <div className="mb-3">
          <h4 className="font-bold text-gray-900 text-sm mb-1">Outros Dados:</h4>
          <div className="text-sm text-gray-700 pl-4 space-y-1">
            <p>
              {resident.bloodType && `Tipo Sanguíneo: ${translateBloodType(resident.bloodType)}`}
              {resident.height && ` | Altura: ${resident.height} m`}
              {resident.weight && ` | Peso: ${resident.weight} kg`}
              {resident.dependencyLevel && ` | Dependência: ${resident.dependencyLevel}`}
            </p>
            {resident.healthStatus && <p>Situação de Saúde: {resident.healthStatus}</p>}
            {resident.medicationsOnAdmission && <p>Medicamentos em Uso: {resident.medicationsOnAdmission}</p>}
            {resident.allergies && <p>Alergias: {resident.allergies}</p>}
            {resident.chronicConditions && <p>Condições Crônicas: {resident.chronicConditions}</p>}
            {resident.medicalReport && resident.medicalReport.length > 0 && resident.medicalReport.map((report, index) => (
              <p key={index}>
                {renderDocumentLink(report.url, `Laudo Médico - ${formatDate(report.date)}`)}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* CONVÊNIOS / PLANOS DE SAÚDE */}
      {resident.healthPlans && resident.healthPlans.length > 0 && (
        <section className="mb-6 border-l-2 border-gray-800 pl-4">
          <h3 className="text-lg font-bold text-gray-900 border-b-2 border-gray-800 pb-2 mb-3 uppercase tracking-wide">
            Convênios / Planos de Saúde
          </h3>
          {resident.healthPlans.map((plan, index) => (
            <div key={index} className="mb-3 text-sm">
              <p className="font-bold text-gray-900">
                {index + 1}. {plan.name}
              </p>
              <p className="text-gray-700 pl-4">
                {plan.cardNumber && `Carteirinha: ${plan.cardNumber}`}
                {plan.cardUrl && (
                  <span className="ml-2">
                    {renderDocumentLink(plan.cardUrl, 'Cartão')}
                  </span>
                )}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* PERTENCES */}
      {resident.belongings && resident.belongings.length > 0 && (
        <section className="mb-6 border-l-2 border-gray-800 pl-4">
          <h3 className="text-lg font-bold text-gray-900 border-b-2 border-gray-800 pb-2 mb-3 uppercase tracking-wide">
            Pertences
          </h3>
          <div className="text-sm text-gray-700 pl-4">
            <ul className="list-disc list-inside space-y-1">
              {resident.belongings.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ACOMODAÇÃO */}
      {(resident.roomId || resident.bedId) && (
        <section className="mb-6 border-l-2 border-gray-800 pl-4">
          <h3 className="text-lg font-bold text-gray-900 border-b-2 border-gray-800 pb-2 mb-3 uppercase tracking-wide">
            Acomodação
          </h3>
          <div className="text-sm text-gray-700">
            {resident.roomId && `Quarto: ${resident.roomId}`}
            {resident.roomId && resident.bedId && ' | '}
            {resident.bedId && `Leito: ${resident.bedId}`}
          </div>
        </section>
      )}

      {/* DOCUMENTOS ANEXADOS */}
      {(resident.documents || resident.addressDocuments || resident.legalGuardianDocuments) && (
        <section className="mb-6 border-l-2 border-gray-800 pl-4">
          <h3 className="text-lg font-bold text-gray-900 border-b-2 border-gray-800 pb-2 mb-3 uppercase tracking-wide">
            Documentos Anexados
          </h3>
          <div className="space-y-1 pl-4">
            {resident.documents && resident.documents.map((doc, index) => (
              <div key={`doc-${index}`}>{renderDocumentLink(doc, `Documento Pessoal ${index + 1}`)}</div>
            ))}
            {resident.addressDocuments && resident.addressDocuments.map((doc, index) => (
              <div key={`addr-${index}`}>{renderDocumentLink(doc, `Comprovante de Endereço ${index + 1}`)}</div>
            ))}
            {resident.legalGuardianDocuments && resident.legalGuardianDocuments.map((doc, index) => (
              <div key={`guardian-${index}`}>{renderDocumentLink(doc, `Documento do Responsável ${index + 1}`)}</div>
            ))}
          </div>
        </section>
      )}

      {/* Rodapé */}
      <div className="border-t-2 border-gray-300 pt-4 mt-8 text-xs text-gray-600 text-center space-y-1">
        {resident.updatedAt && (
          <p>Última modificação: {formatDateTime(resident.updatedAt)}</p>
        )}
        <p>Gerado pelo Sistema RAFA ILPI em {formatDateTime(new Date().toISOString())}</p>
      </div>
    </div>
  )
}
