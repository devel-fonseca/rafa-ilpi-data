import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublicDocumentValidationDto } from './dto/public-document-validation.dto';

interface VaccinationResult {
  id: string;
  publicToken: string;
  originalFileHash: string | null;
  processedFileHash: string | null;
  processingMetadata: Record<string, unknown> | null;
  createdAt: Date;
  tenantId: string;
  tenantName: string;
  tenantCnpj: string;
  schema: string;
}

interface ContractResult {
  id: string;
  publicToken: string;
  originalFileHash: string;
  processedFileHash: string;
  signatories: Record<string, unknown>;
  uploadedBy: string | null;
  uploaderName: string | null;
  uploaderRole: string | null;
  positionCode: string | null;
  registrationType: string | null;
  registrationNumber: string | null;
  registrationState: string | null;
  createdAt: Date;
  tenantId: string;
  tenantName: string;
  tenantCnpj: string;
  schema: string;
}

interface InstitutionalDocumentResult {
  id: string;
  publicToken: string;
  type: string;
  originalFileHash: string | null;
  processedFileHash: string | null;
  processingMetadata: Record<string, unknown> | null;
  createdAt: Date;
  tenantId: string;
  tenantName: string;
  tenantCnpj: string;
  schema: string;
}

interface ResidentDocumentResult {
  id: string;
  publicToken: string;
  type: string;
  originalFileHash: string | null;
  processedFileHash: string | null;
  processingMetadata: Record<string, unknown> | null;
  createdAt: Date;
  residentName: string;
  residentCpf: string;
  tenantId: string;
  tenantName: string;
  tenantCnpj: string;
  schema: string;
}

interface PrescriptionResult {
  id: string;
  publicToken: string;
  originalFileHash: string | null;
  processedFileHash: string | null;
  processingMetadata: unknown;
  createdAt: Date;
  doctorName: string;
  doctorCrm: string;
  doctorCrmState: string;
  tenantId: string;
  tenantName: string;
  tenantCnpj: string | null;
  schema: string;
}

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mapear código de posição para nome legível
   */
  private mapPositionCodeToLabel(positionCode: string | null): string | null {
    if (!positionCode) return null;

    const positionMap: Record<string, string> = {
      ADMINISTRATOR: 'Administrador',
      TECHNICAL_MANAGER: 'Responsável Técnico',
      NURSING_COORDINATOR: 'Coordenador de Enfermagem',
      NURSE: 'Enfermeiro',
      NURSING_TECHNICIAN: 'Técnico de Enfermagem',
      NURSING_ASSISTANT: 'Auxiliar de Enfermagem',
      DOCTOR: 'Médico',
      PSYCHOLOGIST: 'Psicólogo',
      SOCIAL_WORKER: 'Assistente Social',
      PHYSIOTHERAPIST: 'Fisioterapeuta',
      NUTRITIONIST: 'Nutricionista',
      SPEECH_THERAPIST: 'Fonoaudiólogo',
      OCCUPATIONAL_THERAPIST: 'Terapeuta Ocupacional',
      CAREGIVER: 'Cuidador de Idosos',
      ADMINISTRATIVE: 'Administrativo',
      ADMINISTRATIVE_ASSISTANT: 'Assistente Administrativo',
      OTHER: 'Outros',
    };

    return positionMap[positionCode] || positionCode;
  }

  /**
   * Validar documento público por token
   * BUSCA CROSS-TENANT: Pesquisa em TODOS os schemas de tenant usando SQL raw
   */
  async validateDocument(token: string): Promise<PublicDocumentValidationDto> {
    this.logger.log(`Validating document with token: ${token}`);

    // 1. Buscar em vaccinations (cross-tenant)
    const vaccination = await this.findVaccinationByToken(token);
    if (vaccination) {
      this.logger.log(`Found vaccination in schema: ${vaccination.schema}`);
      return this.buildVaccinationResponse(vaccination);
    }

    // 2. Buscar em prescriptions (cross-tenant)
    const prescription = await this.findPrescriptionByToken(token);
    if (prescription) {
      this.logger.log(`Found prescription in schema: ${prescription.schema}`);
      return this.buildPrescriptionResponse(prescription);
    }

    // 3. Buscar em resident_contracts (cross-tenant)
    const contract = await this.findContractByToken(token);
    if (contract) {
      this.logger.log(`Found contract in schema: ${contract.schema}`);
      return this.buildContractResponse(contract);
    }

    // 4. Buscar em tenant_documents (cross-tenant)
    const document = await this.findInstitutionalDocumentByToken(token);
    if (document) {
      this.logger.log(`Found institutional document in schema: ${document.schema}`);
      return this.buildInstitutionalDocumentResponse(document);
    }

    // 5. Buscar em resident_documents (cross-tenant)
    const residentDoc = await this.findResidentDocumentByToken(token);
    if (residentDoc) {
      this.logger.log(`Found resident document in schema: ${residentDoc.schema}`);
      return this.buildResidentDocumentResponse(residentDoc);
    }

    // Documento não encontrado
    this.logger.warn(`Document not found for token: ${token}`);
    throw new NotFoundException('Documento não encontrado ou token inválido');
  }

  /**
   * Buscar vacinação por token em TODOS os schemas de tenant
   * Estratégia: Iterar por todos os schemas e fazer query em cada um
   */
  private async findVaccinationByToken(
    token: string,
  ): Promise<VaccinationResult | null> {
    // 1. Obter todos os schemas de tenant
    const schemas = await this.prisma.$queryRaw<{ schema_name: string }[]>`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name LIKE 'tenant_%'
    `;

    // 2. Buscar em cada schema sequencialmente
    for (const { schema_name } of schemas) {
      try {
        const result = await this.prisma.$queryRawUnsafe<VaccinationResult[]>(`
          SELECT
            v.id::text,
            v."publicToken"::text AS "publicToken",
            v."originalFileHash",
            v."processedFileHash",
            v."processingMetadata",
            v."createdAt",
            t.id::text AS "tenantId",
            t.name AS "tenantName",
            t.cnpj AS "tenantCnpj",
            '${schema_name}' AS schema
          FROM "${schema_name}".vaccinations v
          JOIN "${schema_name}".residents r ON r.id = v."residentId"
          JOIN public.tenants t ON t.id = r."tenantId"
          WHERE v."publicToken" = $1
          LIMIT 1
        `, token);

        if (result.length > 0) {
          return result[0];
        }
      } catch (error) {
        // Schema pode não ter a tabela vaccinations ainda
        this.logger.error(`Schema ${schema_name} - vaccination error: ${error.message}`, error.stack);
      }
    }

    return null;
  }

  /**
   * Buscar prescrição por token em TODOS os schemas de tenant
   */
  private async findPrescriptionByToken(
    token: string,
  ): Promise<PrescriptionResult | null> {
    const schemas = await this.prisma.$queryRaw<{ schema_name: string }[]>`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name LIKE 'tenant_%'
    `;

    for (const { schema_name } of schemas) {
      try {
        const result = await this.prisma.$queryRawUnsafe<PrescriptionResult[]>(`
          SELECT
            p.id::text,
            p."publicToken"::text AS "publicToken",
            p."originalFileHash",
            p."processedFileHash",
            p."processingMetadata",
            p."createdAt",
            p."doctorName",
            p."doctorCrm",
            p."doctorCrmState",
            t.id::text AS "tenantId",
            t.name AS "tenantName",
            t.cnpj AS "tenantCnpj",
            '${schema_name}' AS schema
          FROM "${schema_name}".prescriptions p
          JOIN "${schema_name}".residents r ON r.id = p."residentId"
          JOIN public.tenants t ON t.id = r."tenantId"
          WHERE p."publicToken" = $1
          LIMIT 1
        `, token);

        if (result.length > 0) {
          return result[0];
        }
      } catch (error) {
        this.logger.error(`Schema ${schema_name} - prescription error: ${error.message}`);
      }
    }

    return null;
  }

  /**
   * Buscar contrato por token em TODOS os schemas de tenant
   */
  private async findContractByToken(
    token: string,
  ): Promise<ContractResult | null> {
    // 1. Obter todos os schemas de tenant
    const schemas = await this.prisma.$queryRaw<{ schema_name: string }[]>`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name LIKE 'tenant_%'
    `;

    // 2. Buscar em cada schema sequencialmente
    for (const { schema_name } of schemas) {
      try {
        const result = await this.prisma.$queryRawUnsafe<ContractResult[]>(`
          SELECT
            c.id::text,
            c."publicToken"::text AS "publicToken",
            c."originalFileHash",
            c."processedFileHash",
            c.signatories,
            c."uploadedBy"::text,
            u.name AS "uploaderName",
            u.role AS "uploaderRole",
            up."positionCode",
            up."registrationType",
            up."registrationNumber",
            up."registrationState",
            c."createdAt",
            t.id::text AS "tenantId",
            t.name AS "tenantName",
            t.cnpj AS "tenantCnpj",
            '${schema_name}' AS schema
          FROM "${schema_name}".resident_contracts c
          JOIN "${schema_name}".residents r ON r.id = c."residentId"
          JOIN public.tenants t ON t.id = r."tenantId"
          LEFT JOIN "${schema_name}".users u ON u.id = c."uploadedBy"
          LEFT JOIN "${schema_name}".user_profiles up ON up."userId" = u.id
          WHERE c."publicToken" = $1
          LIMIT 1
        `, token);

        if (result.length > 0) {
          return result[0];
        }
      } catch (error) {
        // Schema pode não ter a tabela resident_contracts ainda
        this.logger.error(`Schema ${schema_name} - contract error: ${error.message}`, error.stack);
      }
    }

    return null;
  }

  /**
   * Buscar documento institucional por token em TODOS os schemas de tenant
   */
  private async findInstitutionalDocumentByToken(
    token: string,
  ): Promise<InstitutionalDocumentResult | null> {
    // 1. Obter todos os schemas de tenant
    const schemas = await this.prisma.$queryRaw<{ schema_name: string }[]>`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name LIKE 'tenant_%'
    `;

    // 2. Buscar em cada schema sequencialmente
    for (const { schema_name } of schemas) {
      try {
        const result = await this.prisma.$queryRawUnsafe<InstitutionalDocumentResult[]>(`
          SELECT
            d.id::text,
            d."publicToken"::text AS "publicToken",
            d.type,
            d."originalFileHash",
            d."processedFileHash",
            d."processingMetadata",
            d."createdAt",
            t.id::text AS "tenantId",
            t.name AS "tenantName",
            t.cnpj AS "tenantCnpj",
            '${schema_name}' AS schema
          FROM "${schema_name}".tenant_documents d
          JOIN public.tenants t ON t.id = d."tenantId"
          WHERE d."publicToken" = $1
          LIMIT 1
        `, token);

        if (result.length > 0) {
          return result[0];
        }
      } catch (error) {
        // Schema pode não ter a tabela tenant_documents ainda
        this.logger.error(`Schema ${schema_name} - document error: ${error.message}`, error.stack);
      }
    }

    return null;
  }

  /**
   * Buscar documento de residente por token em TODOS os schemas de tenant
   * Estratégia: Iterar por todos os schemas e fazer query em cada um
   */
  private async findResidentDocumentByToken(
    token: string,
  ): Promise<ResidentDocumentResult | null> {
    // 1. Obter todos os schemas de tenant
    const schemas = await this.prisma.$queryRaw<{ schema_name: string }[]>`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name LIKE 'tenant_%'
    `;

    // 2. Buscar em cada schema sequencialmente
    for (const { schema_name } of schemas) {
      try {
        const result = await this.prisma.$queryRawUnsafe<ResidentDocumentResult[]>(`
          SELECT
            d.id::text,
            d."publicToken"::text AS "publicToken",
            d.type,
            d."originalFileHash",
            d."processedFileHash",
            d."processingMetadata",
            d."createdAt",
            r."fullName" AS "residentName",
            r.cpf AS "residentCpf",
            t.id::text AS "tenantId",
            t.name AS "tenantName",
            t.cnpj AS "tenantCnpj",
            '${schema_name}' AS schema
          FROM "${schema_name}".resident_documents d
          JOIN "${schema_name}".residents r ON r.id = d."residentId"
          JOIN public.tenants t ON t.id = d."tenantId"
          WHERE d."publicToken" = $1
          LIMIT 1
        `, token);

        if (result.length > 0) {
          return result[0];
        }
      } catch (error) {
        // Schema pode não ter a tabela resident_documents ainda ou com os novos campos
        this.logger.error(`Schema ${schema_name} - resident document error: ${error.message}`, error.stack);
      }
    }

    return null;
  }

  /**
   * Construir resposta para vacinação
   */
  private buildVaccinationResponse(
    vaccination: VaccinationResult,
  ): PublicDocumentValidationDto {
    const metadata = vaccination.processingMetadata as Record<string, unknown>;
    // Suportar ambos os formatos: novo (validatorName) e legado (uploadedBy)
    const validatorName = (metadata?.validatorName as string) || (metadata?.uploadedBy as string) || 'Não informado';
    const validatorRole = (metadata?.validatorRole as string) || (metadata?.userRole as string) || 'Não informado';

    // Montar registro profissional se disponível
    let professionalRegistry: string | undefined = undefined;
    const regType = metadata?.registrationType as string | null;
    const regNumber = metadata?.registrationNumber as string | null;
    const regState = metadata?.registrationState as string | null;

    if (regType && regNumber && regState) {
      professionalRegistry = `${regType} ${regNumber}-${regState}`;
    }

    return {
      valid: true,
      documentType: 'vaccination',
      documentInfo: {
        processedAt: vaccination.createdAt.toISOString(),
        validatedBy: validatorName,
        validatorRole,
        professionalRegistry,
        institutionName: vaccination.tenantName,
        institutionCnpj: vaccination.tenantCnpj,
        hashOriginal: vaccination.originalFileHash || 'N/A',
        hashFinal: vaccination.processedFileHash || 'N/A',
        metadata,
      },
      publicToken: vaccination.publicToken,
      consultedAt: new Date().toISOString(),
    };
  }

  /**
   * Construir resposta para prescrição
   */
  private buildPrescriptionResponse(
    data: PrescriptionResult,
  ): PublicDocumentValidationDto {
    const metadata = data.processingMetadata as Record<string, unknown>;

    // Extrair dados do usuário que fez upload do processingMetadata
    const validatorName = (metadata?.validatorName as string) || (metadata?.uploadedBy as string) || (metadata?.userName as string) || 'Não informado';
    const validatorRole = (metadata?.validatorRole as string) || (metadata?.userRole as string) || 'Não informado';

    // Montar registro profissional se disponível
    let professionalRegistry: string | undefined = undefined;
    const regType = metadata?.registrationType as string | null;
    const regNumber = metadata?.registrationNumber as string | null;
    const regState = metadata?.registrationState as string | null;

    if (regType && regNumber && regState) {
      professionalRegistry = `${regType} ${regNumber}-${regState}`;
    } else if (metadata?.userProfessionalRegistry) {
      professionalRegistry = metadata.userProfessionalRegistry as string;
    }

    return {
      valid: true,
      documentType: 'prescription',
      documentInfo: {
        processedAt: data.createdAt.toISOString(),
        validatedBy: validatorName,
        validatorRole,
        professionalRegistry,
        institutionName: data.tenantName,
        institutionCnpj: data.tenantCnpj || 'N/A',
        hashOriginal: data.originalFileHash || 'N/A',
        hashFinal: data.processedFileHash || 'N/A',
        metadata: {
          prescriptionType: metadata?.prescriptionType,
          prescriptionDate: metadata?.prescriptionDate,
          doctorName: data.doctorName,
          doctorCrm: data.doctorCrm,
          doctorCrmState: data.doctorCrmState,
        },
      },
      publicToken: data.publicToken,
      consultedAt: new Date().toISOString(),
    };
  }

  /**
   * Construir resposta para contrato
   */
  private buildContractResponse(
    contract: ContractResult,
  ): PublicDocumentValidationDto {
    let professionalRegistry: string | undefined = undefined;
    if (
      contract.registrationType &&
      contract.registrationNumber &&
      contract.registrationState
    ) {
      professionalRegistry = `${contract.registrationType} ${contract.registrationNumber}-${contract.registrationState}`;
    }

    const metadata = {
      signatories: contract.signatories,
      uploadedBy: contract.uploadedBy,
    };

    // Usar o cargo do perfil (convertido) ou fallback para o role
    const validatorRole = this.mapPositionCodeToLabel(contract.positionCode)
      || contract.uploaderRole
      || 'Não informado';

    return {
      valid: true,
      documentType: 'contract',
      documentInfo: {
        processedAt: contract.createdAt.toISOString(),
        validatedBy: contract.uploaderName || 'Usuário não disponível',
        validatorRole,
        professionalRegistry,
        institutionName: contract.tenantName,
        institutionCnpj: contract.tenantCnpj,
        hashOriginal: contract.originalFileHash,
        hashFinal: contract.processedFileHash,
        metadata,
      },
      publicToken: contract.publicToken,
      consultedAt: new Date().toISOString(),
    };
  }

  /**
   * Construir resposta para documento institucional
   */
  private buildInstitutionalDocumentResponse(
    document: InstitutionalDocumentResult,
  ): PublicDocumentValidationDto {
    const metadata = document.processingMetadata as Record<string, unknown>;
    const validatorName = (metadata?.validatorName as string) || 'Não informado';
    const validatorRole = (metadata?.validatorRole as string) || 'Não informado';

    // Montar registro profissional se disponível
    let professionalRegistry: string | undefined = undefined;
    const regType = metadata?.registrationType as string | null;
    const regNumber = metadata?.registrationNumber as string | null;
    const regState = metadata?.registrationState as string | null;

    if (regType && regNumber && regState) {
      professionalRegistry = `${regType} ${regNumber}-${regState}`;
    }

    return {
      valid: true,
      documentType: 'institutional_document',
      documentInfo: {
        processedAt: document.createdAt.toISOString(),
        validatedBy: validatorName,
        validatorRole,
        professionalRegistry,
        institutionName: document.tenantName,
        institutionCnpj: document.tenantCnpj,
        hashOriginal: document.originalFileHash || 'N/A',
        hashFinal: document.processedFileHash || 'N/A',
        metadata: {
          ...metadata,
          documentType: document.type,
        },
      },
      publicToken: document.publicToken,
      consultedAt: new Date().toISOString(),
    };
  }

  /**
   * Construir resposta para documento de residente
   */
  private buildResidentDocumentResponse(
    document: ResidentDocumentResult,
  ): PublicDocumentValidationDto {
    const metadata = document.processingMetadata as Record<string, unknown>;
    const validatorName = (metadata?.validatorName as string) || 'Não informado';
    const validatorRole = (metadata?.validatorRole as string) || 'Não informado';

    // Montar registro profissional se disponível
    let professionalRegistry: string | undefined = undefined;
    const regType = metadata?.registrationType as string | null;
    const regNumber = metadata?.registrationNumber as string | null;
    const regState = metadata?.registrationState as string | null;

    if (regType && regNumber && regState) {
      professionalRegistry = `${regType} ${regNumber}-${regState}`;
    }

    return {
      valid: true,
      documentType: 'resident_document',
      documentInfo: {
        processedAt: document.createdAt.toISOString(),
        validatedBy: validatorName,
        validatorRole,
        professionalRegistry,
        institutionName: document.tenantName,
        institutionCnpj: document.tenantCnpj,
        hashOriginal: document.originalFileHash || 'N/A',
        hashFinal: document.processedFileHash || 'N/A',
        metadata: {
          ...metadata,
          documentType: document.type,
          residentName: document.residentName,
          residentCpf: document.residentCpf,
        },
      },
      publicToken: document.publicToken,
      consultedAt: new Date().toISOString(),
    };
  }
}
