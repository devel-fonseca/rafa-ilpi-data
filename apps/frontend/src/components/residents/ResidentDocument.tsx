import type { Resident } from "@/api/residents.api";
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
} from "@/utils/formatters";

import ResidentDocumentSection from "./ResidentDocumentSection";
import ResidentDocumentSectionTitle from "./ResidentDocumentSectionTitle";
import { PhotoViewer } from "@/components/form/PhotoViewer";

interface ResidentData extends Resident {
  photo?: { url: string; uploadedAt: string } | null;
  documents?: string[] | null;
  addressDocuments?: string[] | null;
  emergencyContacts?: Array<{
    name: string;
    phone: string;
    relationship: string;
  }> | null;
  legalGuardianDocuments?: string[] | null;
  healthPlans?: Array<{
    name: string;
    cardNumber?: string | null;
    cardUrl?: string | null;
  }> | null;
  medicalReport?: Array<{ url: string; date: string }> | null;
  belongings?: string[] | null;
}

interface TenantData {
  name: string;
  address: string;
  addressNumber: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  addressZipCode: string;
  cnpj: string;
  phone: string;
}

interface ResidentDocumentProps {
  resident: ResidentData;
  tenant: TenantData;
  isPrinting?: boolean;
}

export default function ResidentDocument({
  resident,
  tenant,
  isPrinting = false,
}: ResidentDocumentProps) {
  const translateBloodType = (bloodType?: string) => {
    if (!bloodType || bloodType === "NAO_INFORMADO") return "";
    const map: Record<string, string> = {
      A_POSITIVO: "A+",
      A_NEGATIVO: "A-",
      B_POSITIVO: "B+",
      B_NEGATIVO: "B-",
      AB_POSITIVO: "AB+",
      AB_NEGATIVO: "AB-",
      O_POSITIVO: "O+",
      O_NEGATIVO: "O-",
    };
    return map[bloodType] || bloodType;
  };

  const renderDocumentLink = (
    url: string | null | undefined,
    label: string
  ) => {
    if (!url) return null;
    if (isPrinting) return <p className="text-sm">{label}</p>;
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline text-sm"
      >
        {label}
      </a>
    );
  };

  return (
    <div className="print-container text-gray-900 leading-relaxed">
      {/* CABEÇALHO */}
      <header className="text-center mb-10">
        <h1 className="text-3xl font-bold uppercase mb-2">{tenant.name}</h1>
        <p className="text-sm">
          {tenant.address}, {tenant.addressNumber} – {tenant.addressDistrict} –{" "}
          {tenant.addressCity}/{tenant.addressState}
        </p>
        <p className="text-sm">
          CEP {formatCEP(tenant.addressZipCode)} | CNPJ {tenant.cnpj} | Tel.{" "}
          {formatPhone(tenant.phone)}
        </p>

        <hr className="mt-6" />

        <h2 className="text-2xl font-semibold uppercase mt-6">
          Registro de Residente
        </h2>
      </header>

      {/* FOTO + DADOS BÁSICOS */}
      <section className="mb-10 print-avoid-break">
        <div className="flex gap-6">
          {/* Foto */}
          <div className="w-[140px] h-[180px] border border-gray-300 overflow-hidden">
            <PhotoViewer
              photoUrl={resident.fotoUrl}
              altText={resident.fullName}
              size="large"
              className="w-[140px] h-[180px]"
            />
          </div>

          {/* Dados */}
          <div className="flex-1">
            <p>
              <strong>Nome:</strong> {resident.fullName || ""}
            </p>
            {resident.socialName && (
              <p>
                <strong>Nome social:</strong> {resident.socialName}
              </p>
            )}
            <p>
              <strong>Data de nascimento:</strong>{" "}
              {formatDate(resident.birthDate)}
              {resident.birthDate && (
                <span className="ml-2 text-sm text-gray-700">
                  ({calculateAge(resident.birthDate)})
                </span>
              )}
            </p>
            <p>
              <strong>CPF:</strong> {formatCPF(resident.cpf)}
            </p>
            <p>
              <strong>CNS:</strong> {formatCNS(resident.cns)}
            </p>
          </div>
        </div>
        <hr className="mt-6" />
      </section>

      {/* DADOS PESSOAIS */}
      <ResidentDocumentSection>
        <ResidentDocumentSectionTitle>
          Dados Pessoais
        </ResidentDocumentSectionTitle>

        <p>
          <strong>RG:</strong>{" "}
          {resident.rg ? formatRG(resident.rg, resident.rgIssuer) : ""}
        </p>
        <p>
          <strong>Órgão Expedidor:</strong> {resident.rgIssuer || ""}
        </p>
        <p>
          <strong>Escolaridade:</strong>{" "}
          {translateEnum.escolaridade(resident.education) || ""}
        </p>
        <p>
          <strong>Profissão:</strong> {resident.profession || ""}
        </p>
        <p>
          <strong>Gênero:</strong> {translateEnum.gender(resident.gender) || ""}
        </p>
        <p>
          <strong>Estado civil:</strong>{" "}
          {translateEnum.estadoCivil(resident.civilStatus) || ""}
        </p>
        <p>
          <strong>Religião:</strong> {resident.religion || ""}
        </p>
        <p>
          <strong>Nacionalidade:</strong> {resident.nationality || ""}
        </p>
        <p>
          <strong>Local de nascimento:</strong>
          {resident.birthCity
            ? `${resident.birthCity}${
                resident.birthState ? `/${resident.birthState}` : ""
              }`
            : ""}
        </p>
        <p>
          <strong>Mãe:</strong> {resident.motherName || ""}
        </p>
        <p>
          <strong>Pai:</strong> {resident.fatherName || ""}
        </p>
      </ResidentDocumentSection>

      {/* ENDEREÇOS */}
      <ResidentDocumentSection>
        <ResidentDocumentSectionTitle>Endereços</ResidentDocumentSectionTitle>

        <p className="font-semibold mt-3">Endereço Atual</p>
        <p>
          {resident.currentStreet || ""}
          {resident.currentNumber ? `, ${resident.currentNumber}` : ""}
          {resident.currentComplement ? ` – ${resident.currentComplement}` : ""}
          {resident.currentDistrict ? ` – ${resident.currentDistrict}` : ""}
        </p>
        <p>
          {resident.currentCity || ""}
          {resident.currentState ? `/${resident.currentState}` : ""}
          {resident.currentCep
            ? ` – CEP ${formatCEP(resident.currentCep)}`
            : ""}
        </p>
        <p>
          {resident.currentPhone
            ? `Telefone: ${formatPhone(resident.currentPhone)}`
            : ""}
        </p>

        <p className="font-semibold mt-6">Endereço de Procedência</p>
        <p>
          {resident.originStreet || ""}
          {resident.originNumber ? `, ${resident.originNumber}` : ""}
          {resident.originComplement ? ` – ${resident.originComplement}` : ""}
          {resident.originDistrict ? ` – ${resident.originDistrict}` : ""}
        </p>
        <p>
          {resident.originCity || ""}
          {resident.originState ? `/${resident.originState}` : ""}
          {resident.originCep ? ` – CEP ${formatCEP(resident.originCep)}` : ""}
        </p>
        <p>
          {resident.originPhone
            ? `Telefone: ${formatPhone(resident.originPhone)}`
            : ""}
        </p>
      </ResidentDocumentSection>

      {/* CONTATOS DE EMERGÊNCIA */}
      <ResidentDocumentSection>
        <ResidentDocumentSectionTitle>
          Contatos de Emergência
        </ResidentDocumentSectionTitle>

        {resident.emergencyContacts && resident.emergencyContacts.length > 0 ? (
          resident.emergencyContacts.map((c, i) => (
            <p key={i} className="mb-2">
              <strong>{c.name}</strong>
              {c.relationship ? ` (${c.relationship})` : ""}
              {c.phone ? ` – Tel. ${formatPhone(c.phone)}` : ""}
            </p>
          ))
        ) : (
          <p></p>
        )}
      </ResidentDocumentSection>

      {/* RESPONSÁVEL LEGAL */}
      <ResidentDocumentSection>
        <ResidentDocumentSectionTitle>
          Responsável Legal
        </ResidentDocumentSectionTitle>

        <p>
          <strong>Nome:</strong> {resident.legalGuardianName || ""}
        </p>
        <p>
          <strong>CPF:</strong>{" "}
          {resident.legalGuardianCpf
            ? formatCPF(resident.legalGuardianCpf)
            : ""}
        </p>
        <p>
          <strong>RG:</strong> {resident.legalGuardianRg || ""}
        </p>
        <p>
          <strong>Tipo:</strong>{" "}
          {resident.legalGuardianType
            ? translateEnum.tipoResponsavel(resident.legalGuardianType)
            : ""}
        </p>
        <p>
          <strong>Telefone:</strong>{" "}
          {resident.legalGuardianPhone
            ? formatPhone(resident.legalGuardianPhone)
            : ""}
        </p>

        <p className="mt-4">
          <strong>Endereço:</strong>
          <br />
          {resident.legalGuardianStreet || ""}
          {resident.legalGuardianNumber
            ? `, ${resident.legalGuardianNumber}`
            : ""}
          {resident.legalGuardianComplement
            ? ` – ${resident.legalGuardianComplement}`
            : ""}
          {resident.legalGuardianDistrict
            ? ` – ${resident.legalGuardianDistrict}`
            : ""}
          <br />
          {resident.legalGuardianCity || ""}
          {resident.legalGuardianState ? `/${resident.legalGuardianState}` : ""}
          {resident.legalGuardianCep
            ? ` – CEP ${formatCEP(resident.legalGuardianCep)}`
            : ""}
        </p>
      </ResidentDocumentSection>

      {/* ADMISSÃO */}
      <ResidentDocumentSection>
        <ResidentDocumentSectionTitle>
          Admissão e Desligamento
        </ResidentDocumentSectionTitle>

        <p>
          <strong>Data de admissão:</strong>{" "}
          {resident.admissionDate ? formatDate(resident.admissionDate) : ""}
        </p>
        <p>
          <strong>Tipo:</strong>{" "}
          {resident.admissionType
            ? translateEnum.tipoAdmissao(resident.admissionType)
            : ""}
        </p>
        <p>
          <strong>Motivo:</strong> {resident.admissionReason || ""}
        </p>
        <p>
          <strong>Condições:</strong> {resident.admissionConditions || ""}
        </p>

        <p className="mt-4">
          <strong>Data de desligamento:</strong>{" "}
          {resident.dischargeDate ? formatDate(resident.dischargeDate) : ""}
        </p>
        <p>
          <strong>Motivo do desligamento:</strong>{" "}
          {resident.dischargeReason || ""}
        </p>
      </ResidentDocumentSection>

      {/* SAÚDE */}
      <ResidentDocumentSection>
        <ResidentDocumentSectionTitle>Saúde</ResidentDocumentSectionTitle>

        <p>
          <strong>Necessidades especiais:</strong> {resident.specialNeeds || ""}
        </p>
        <p>
          <strong>Restrições alimentares:</strong>{" "}
          {resident.dietaryRestrictions || ""}
        </p>
        <p>
          <strong>Aspectos funcionais:</strong>{" "}
          {resident.functionalAspects || ""}
        </p>
        <p>
          <strong>Auxílio de mobilidade:</strong>{" "}
          {resident.mobilityAid ? "Sim" : ""}
        </p>

        <p className="mt-4">
          <strong>Dados Clínicos:</strong>
          <br />
          {resident.bloodType
            ? `Tipo sanguíneo: ${translateBloodType(resident.bloodType)}`
            : ""}
          {resident.height ? ` | Altura: ${resident.height}m` : ""}
          {resident.weight ? ` | Peso: ${resident.weight}kg` : ""}
          {resident.dependencyLevel
            ? ` | Grau de dependência: ${resident.dependencyLevel}`
            : ""}
        </p>

        <p>
          {resident.healthStatus
            ? `Situação de Saúde: ${resident.healthStatus}`
            : ""}
        </p>
        <p>
          {resident.medicationsOnAdmission
            ? `Medicamentos em uso: ${resident.medicationsOnAdmission}`
            : ""}
        </p>
        <p>{resident.allergies ? `Alergias: ${resident.allergies}` : ""}</p>
        <p>
          {resident.chronicConditions
            ? `Condições crônicas: ${resident.chronicConditions}`
            : ""}
        </p>

        {resident.medicalReport?.length ? (
          <div className="mt-3">
            {resident.medicalReport.map((r, i) => (
              <p key={i}>
                {renderDocumentLink(
                  r.url,
                  `Laudo médico – ${formatDate(r.date)}`
                )}
              </p>
            ))}
          </div>
        ) : null}
      </ResidentDocumentSection>

      {/* PLANOS DE SAÚDE */}
      <ResidentDocumentSection>
        <ResidentDocumentSectionTitle>
          Convênios / Planos de Saúde
        </ResidentDocumentSectionTitle>

        {resident.healthPlans?.length ? (
          resident.healthPlans.map((p, i) => (
            <p key={i} className="mb-2">
              <strong>{p.name}</strong>
              {p.cardNumber ? ` – Cartão: ${p.cardNumber}` : ""}
              {p.cardUrl && (
                <span className="ml-2">
                  {renderDocumentLink(p.cardUrl, "Ver cartão")}
                </span>
              )}
            </p>
          ))
        ) : (
          <p></p>
        )}
      </ResidentDocumentSection>

      {/* PERTENCES */}
      <ResidentDocumentSection>
        <ResidentDocumentSectionTitle>Pertences</ResidentDocumentSectionTitle>

        {resident.belongings?.length ? (
          <ul className="list-disc pl-6">
            {resident.belongings.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        ) : (
          <p></p>
        )}
      </ResidentDocumentSection>

      {/* ACOMODAÇÃO */}
      <ResidentDocumentSection>
        <ResidentDocumentSectionTitle>Acomodação</ResidentDocumentSectionTitle>

        <p>
          {resident.room
            ? `Quarto: ${resident.room.name} (${resident.room.code})`
            : ""}
          {resident.bed ? ` | Leito: ${resident.bed.code}` : ""}
        </p>
      </ResidentDocumentSection>

      {/* DOCUMENTOS ANEXADOS */}
      <ResidentDocumentSection>
        <ResidentDocumentSectionTitle>
          Documentos Anexados
        </ResidentDocumentSectionTitle>

        {resident.documents?.length ? (
          resident.documents.map((d, i) => (
            <p key={i}>{renderDocumentLink(d, `Documento pessoal ${i + 1}`)}</p>
          ))
        ) : (
          <p></p>
        )}

        {resident.addressDocuments?.length
          ? resident.addressDocuments.map((d, i) => (
              <p key={i}>
                {renderDocumentLink(d, `Comprovante de endereço ${i + 1}`)}
              </p>
            ))
          : null}

        {resident.legalGuardianDocuments?.length
          ? resident.legalGuardianDocuments.map((d, i) => (
              <p key={i}>
                {renderDocumentLink(d, `Documento do responsável ${i + 1}`)}
              </p>
            ))
          : null}
      </ResidentDocumentSection>

      {/* RODAPÉ */}
      <footer className="text-center text-xs mt-10">
        {resident.updatedAt && (
          <p>Última alteração: {formatDateTime(resident.updatedAt)}</p>
        )}
        <p>
          Gerado automaticamente pelo Sistema RAFA ILPI em{" "}
          {formatDateTime(new Date().toISOString())}
        </p>
      </footer>
    </div>
  );
}
