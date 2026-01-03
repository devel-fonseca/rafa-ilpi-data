import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { FilesService } from '../files/files.service'
import { CreateClinicalNoteDto } from './dto/create-clinical-note.dto'
import { UpdateClinicalNoteDto } from './dto/update-clinical-note.dto'
import { QueryClinicalNoteDto } from './dto/query-clinical-note.dto'
import { DeleteClinicalNoteDto } from './dto/delete-clinical-note.dto'
import { ClinicalNote, ClinicalNoteHistory } from '@prisma/client'
import {
  ClinicalProfession,
  isAuthorizedForProfession,
  getUnauthorizedMessage,
} from './professional-authorization.config'

/**
 * Service para gerenciamento de Evoluções Clínicas Multiprofissionais (SOAP)
 *
 * Implementa:
 * - Criação com cálculo de editableUntil (noteDate + 12h)
 * - Validação de janela de edição (12 horas)
 * - Versionamento automático
 * - Histórico completo de alterações
 * - Soft delete com motivo obrigatório
 * - Filtros e paginação
 */
@Injectable()
export class ClinicalNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  /**
   * Processa documentos de uma evolução clínica, gerando URLs assinadas
   */
  private async processDocumentUrls(note: any): Promise<any> {
    if (!note) return note

    // Se a nota tem documentos, processar URLs
    if (note.documents && Array.isArray(note.documents)) {
      const documentsWithUrls = await Promise.all(
        note.documents.map(async (doc: any) => {
          if (doc.pdfFileUrl) {
            // Gerar URL assinada
            const signedUrl = await this.filesService.getFileUrl(doc.pdfFileUrl)
            return {
              ...doc,
              pdfFileUrl: signedUrl,
            }
          }
          return doc
        }),
      )

      return {
        ...note,
        documents: documentsWithUrls,
      }
    }

    return note
  }

  /**
   * Cria uma nova evolução clínica
   *
   * Regras:
   * - Calcular editableUntil = noteDate + 12 horas
   * - Inicializar version = 1
   * - Ao menos 1 campo SOAP deve estar preenchido
   */
  async create(
    createDto: CreateClinicalNoteDto,
    userId: string,
    tenantId: string,
    pdfFile?: Express.Multer.File,
  ): Promise<ClinicalNote> {
    // Validar se ao menos 1 campo SOAP foi preenchido
    if (
      !createDto.subjective &&
      !createDto.objective &&
      !createDto.assessment &&
      !createDto.plan
    ) {
      throw new BadRequestException(
        'Ao menos um campo SOAP (S, O, A ou P) deve ser preenchido',
      )
    }

    // VALIDAÇÃO DE HABILITAÇÃO PROFISSIONAL
    // Buscar positionCode do usuário (está na tabela user_profiles)
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { userId: userId },
      select: { positionCode: true },
    })

    if (!userProfile || !userProfile.positionCode) {
      throw new NotFoundException('Perfil profissional não encontrado')
    }

    // Verificar se o cargo está habilitado para registrar a profissão
    const profession = createDto.profession as ClinicalProfession
    if (!isAuthorizedForProfession(userProfile.positionCode, profession)) {
      throw new ForbiddenException(
        getUnauthorizedMessage(userProfile.positionCode, profession),
      )
    }

    // Calcular noteDate (default: now)
    const noteDate = createDto.noteDate ? new Date(createDto.noteDate) : new Date()

    // Calcular editableUntil (noteDate + 12 horas)
    const editableUntil = new Date(noteDate.getTime() + 12 * 60 * 60 * 1000)

    // Criar evolução clínica
    const clinicalNote = await this.prisma.clinicalNote.create({
      data: {
        tenantId,
        residentId: createDto.residentId,
        professionalId: userId,
        profession: createDto.profession,
        noteDate,
        subjective: createDto.subjective || null,
        objective: createDto.objective || null,
        assessment: createDto.assessment || null,
        plan: createDto.plan || null,
        tags: createDto.tags || [],
        vitalSignAlertId: createDto.vitalSignAlertId || null,
        createdBy: userId,
        version: 1,
        isAmended: false,
        editableUntil,
      },
      include: {
        professional: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        resident: {
          select: {
            id: true,
            fullName: true,
            cpf: true,
          },
        },
      },
    })

    // Se documento foi fornecido, criar ClinicalNoteDocument e fazer upload do PDF
    if (createDto.document && pdfFile) {
      // 1. Criar registro do documento
      const clinicalDoc = await this.prisma.clinicalNoteDocument.create({
        data: {
          tenantId,
          noteId: clinicalNote.id,
          residentId: createDto.residentId,
          title: createDto.document.title,
          type: createDto.document.type || null,
          documentDate: noteDate,
          htmlContent: createDto.document.htmlContent,
          createdBy: userId,
        },
      })

      // 2. Upload do PDF para MinIO
      const uploadResult = await this.filesService.uploadFile(
        tenantId,
        pdfFile,
        'clinical-documents',
        clinicalDoc.id,
      )

      // 3. Atualizar registro com informações do PDF
      await this.prisma.clinicalNoteDocument.update({
        where: { id: clinicalDoc.id },
        data: {
          pdfFileUrl: uploadResult.fileUrl,
          pdfFileKey: uploadResult.fileId,
          pdfFileName: uploadResult.fileName,
        },
      })
    }

    return clinicalNote
  }

  /**
   * Busca evolução clínica por ID
   */
  async findOne(id: string, tenantId: string): Promise<ClinicalNote | null> {
    const note = await this.prisma.clinicalNote.findFirst({
      where: {
        id,
        tenantId,
        isAmended: false, // Não retornar evoluções marcadas como obsoletas
      },
      include: {
        professional: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        resident: {
          select: {
            id: true,
            fullName: true,
            cpf: true,
          },
        },
        documents: {
          select: {
            id: true,
            title: true,
            type: true,
            pdfFileUrl: true,
            documentDate: true,
          },
        },
      },
    })

    if (!note) {
      throw new NotFoundException('Evolução clínica não encontrada')
    }

    // Processar URLs dos documentos
    return this.processDocumentUrls(note)
  }

  /**
   * Lista evoluções clínicas com filtros e paginação
   */
  async findAll(
    queryDto: QueryClinicalNoteDto,
    tenantId: string,
  ): Promise<{ data: ClinicalNote[]; total: number; page: number; limit: number }> {
    const page = queryDto.page || 1
    const limit = queryDto.limit || 20
    const skip = (page - 1) * limit

    // Construir filtros
    const where: any = {
      tenantId,
      isAmended: false, // Não listar evoluções obsoletas
    }

    if (queryDto.profession) {
      where.profession = queryDto.profession
    }

    if (queryDto.startDate || queryDto.endDate) {
      where.noteDate = {}
      if (queryDto.startDate) {
        where.noteDate.gte = new Date(queryDto.startDate)
      }
      if (queryDto.endDate) {
        where.noteDate.lte = new Date(queryDto.endDate)
      }
    }

    if (queryDto.tags && queryDto.tags.length > 0) {
      where.tags = {
        hasSome: queryDto.tags,
      }
    }

    // Buscar dados e contagem total
    const [data, total] = await Promise.all([
      this.prisma.clinicalNote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { noteDate: 'desc' },
        include: {
          professional: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          resident: {
            select: {
              id: true,
              fullName: true,
              cpf: true,
            },
          },
          documents: {
            select: {
              id: true,
              title: true,
              type: true,
              pdfFileUrl: true,
              documentDate: true,
            },
          },
        },
      }),
      this.prisma.clinicalNote.count({ where }),
    ])

    // Processar URLs dos documentos para todas as notas
    const dataWithUrls = await Promise.all(
      data.map((note) => this.processDocumentUrls(note)),
    )

    return {
      data: dataWithUrls,
      total,
      page,
      limit,
    }
  }

  /**
   * Busca evoluções clínicas de um residente específico
   */
  async findByResident(
    residentId: string,
    tenantId: string,
    queryDto?: QueryClinicalNoteDto,
  ): Promise<{ data: ClinicalNote[]; total: number }> {
    const page = queryDto?.page || 1
    const limit = queryDto?.limit || 20
    const skip = (page - 1) * limit

    const where: any = {
      tenantId,
      residentId,
      isAmended: false,
    }

    if (queryDto?.profession) {
      where.profession = queryDto.profession
    }

    if (queryDto?.tags && queryDto.tags.length > 0) {
      where.tags = {
        hasSome: queryDto.tags,
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.clinicalNote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { noteDate: 'desc' },
        include: {
          professional: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          resident: {
            select: {
              id: true,
              fullName: true,
              cpf: true,
            },
          },
          documents: {
            select: {
              id: true,
              title: true,
              type: true,
              pdfFileUrl: true,
              documentDate: true,
            },
          },
        },
      }),
      this.prisma.clinicalNote.count({ where }),
    ])

    // Processar URLs dos documentos para todas as notas
    const dataWithUrls = await Promise.all(
      data.map((note) => this.processDocumentUrls(note)),
    )

    return { data: dataWithUrls, total }
  }

  /**
   * Atualiza evolução clínica (com versionamento)
   *
   * Regras:
   * - Apenas o autor pode editar (userId === createdBy)
   * - Janela de edição de 12 horas (now() < editableUntil)
   * - Criar snapshot no ClinicalNoteHistory
   * - Incrementar version
   * - editReason obrigatório (min 10 caracteres)
   */
  async update(
    id: string,
    updateDto: UpdateClinicalNoteDto,
    userId: string,
    tenantId: string,
  ): Promise<ClinicalNote> {
    // Buscar evolução clínica
    const note = await this.prisma.clinicalNote.findFirst({
      where: { id, tenantId, isAmended: false },
    })

    if (!note) {
      throw new NotFoundException('Evolução clínica não encontrada')
    }

    // Validar autoria (apenas o autor pode editar)
    if (note.createdBy !== userId) {
      throw new ForbiddenException('Apenas o autor pode editar esta evolução clínica')
    }

    // VALIDAÇÃO DE HABILITAÇÃO PROFISSIONAL (mesmo na edição)
    // Buscar positionCode do usuário (está na tabela user_profiles)
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { userId: userId },
      select: { positionCode: true },
    })

    if (!userProfile || !userProfile.positionCode) {
      throw new NotFoundException('Perfil profissional não encontrado')
    }

    // Verificar se o cargo está habilitado para a profissão da evolução
    const profession = note.profession as unknown as ClinicalProfession
    if (!isAuthorizedForProfession(userProfile.positionCode, profession)) {
      throw new ForbiddenException(
        getUnauthorizedMessage(userProfile.positionCode, profession),
      )
    }

    // Validar janela de edição (12 horas)
    const now = new Date()
    if (now > note.editableUntil) {
      throw new ForbiddenException(
        'Janela de edição expirada (12 horas). Não é mais possível editar esta evolução.',
      )
    }

    // Validar se ao menos 1 campo foi atualizado
    const hasUpdates =
      updateDto.subjective !== undefined ||
      updateDto.objective !== undefined ||
      updateDto.assessment !== undefined ||
      updateDto.plan !== undefined ||
      updateDto.tags !== undefined

    if (!hasUpdates) {
      throw new BadRequestException('Ao menos um campo deve ser atualizado')
    }

    // Criar snapshot no histórico
    const newVersion = note.version + 1

    return this.prisma.$transaction(async (prisma) => {
      // 1. Criar histórico
      await prisma.clinicalNoteHistory.create({
        data: {
          noteId: note.id,
          version: note.version,
          tenantId: note.tenantId,
          residentId: note.residentId,
          professionalId: note.professionalId,
          profession: note.profession,
          noteDate: note.noteDate,
          subjective: note.subjective,
          objective: note.objective,
          assessment: note.assessment,
          plan: note.plan,
          tags: note.tags,
          changeReason: updateDto.editReason,
          changedBy: userId,
        },
      })

      // 2. Atualizar evolução clínica
      return prisma.clinicalNote.update({
        where: { id },
        data: {
          subjective: updateDto.subjective ?? note.subjective,
          objective: updateDto.objective ?? note.objective,
          assessment: updateDto.assessment ?? note.assessment,
          plan: updateDto.plan ?? note.plan,
          tags: updateDto.tags ?? note.tags,
          version: newVersion,
          updatedBy: userId,
        },
        include: {
          professional: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          resident: {
            select: {
              id: true,
              fullName: true,
              cpf: true,
            },
          },
        },
      })
    })
  }

  /**
   * Soft delete (marca isAmended = true)
   *
   * Regras:
   * - Apenas usuários com permissão DELETE_CLINICAL_NOTES podem excluir
   * - deleteReason obrigatório (min 10 caracteres)
   * - Criar versão final no histórico
   */
  async softDelete(
    id: string,
    deleteDto: DeleteClinicalNoteDto,
    userId: string,
    tenantId: string,
  ): Promise<void> {
    const note = await this.prisma.clinicalNote.findFirst({
      where: { id, tenantId, isAmended: false },
    })

    if (!note) {
      throw new NotFoundException('Evolução clínica não encontrada')
    }

    await this.prisma.$transaction(async (prisma) => {
      // 1. Criar versão final no histórico
      await prisma.clinicalNoteHistory.create({
        data: {
          noteId: note.id,
          version: note.version,
          tenantId: note.tenantId,
          residentId: note.residentId,
          professionalId: note.professionalId,
          profession: note.profession,
          noteDate: note.noteDate,
          subjective: note.subjective,
          objective: note.objective,
          assessment: note.assessment,
          plan: note.plan,
          tags: note.tags,
          changeReason: `[EXCLUSÃO] ${deleteDto.deleteReason}`,
          changedBy: userId,
        },
      })

      // 2. Marcar como obsoleto
      await prisma.clinicalNote.update({
        where: { id },
        data: {
          isAmended: true,
          updatedBy: userId,
        },
      })
    })
  }

  /**
   * Busca histórico de versões de uma evolução clínica
   */
  async getHistory(
    noteId: string,
    tenantId: string,
  ) {
    const note = await this.prisma.clinicalNote.findFirst({
      where: { id: noteId, tenantId },
    })

    if (!note) {
      throw new NotFoundException('Evolução clínica não encontrada')
    }

    const history = await this.prisma.clinicalNoteHistory.findMany({
      where: { noteId },
      orderBy: { version: 'asc' },
      include: {
        professional: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        changedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return {
      currentVersion: note.version,
      isAmended: note.isAmended,
      history,
    }
  }

  /**
   * Busca tags únicas usadas em evoluções clínicas (para sugestões)
   */
  async getTagsSuggestions(tenantId: string): Promise<string[]> {
    const notes = await this.prisma.clinicalNote.findMany({
      where: { tenantId, isAmended: false },
      select: { tags: true },
    })

    // Extrair todas as tags e remover duplicatas
    const allTags = notes.flatMap((note) => note.tags)
    return [...new Set(allTags)].sort()
  }

  /**
   * Busca documentos clínicos (Tiptap) de um residente
   * Retorna todos os documentos PDF criados junto com evoluções clínicas
   */
  async getDocumentsByResident(residentId: string, tenantId: string) {
    // Verificar se residente existe e pertence ao tenant
    const resident = await this.prisma.resident.findUnique({
      where: {
        id: residentId,
        tenantId,
      },
    })

    if (!resident) {
      throw new NotFoundException('Residente não encontrado')
    }

    // Buscar documentos do residente com informações do profissional
    const documents = await this.prisma.clinicalNoteDocument.findMany({
      where: {
        residentId,
        tenantId,
      },
      include: {
        clinicalNote: {
          select: {
            profession: true,
            professional: {
              select: {
                name: true,
                profile: {
                  select: {
                    registrationNumber: true,
                    registrationState: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        documentDate: 'desc',
      },
    })

    // Processar URLs assinadas para cada documento
    const documentsWithSignedUrls = await Promise.all(
      documents.map(async (doc) => {
        if (doc.pdfFileUrl) {
          const signedUrl = await this.filesService.getFileUrl(doc.pdfFileUrl)
          return {
            ...doc,
            pdfFileUrl: signedUrl,
          }
        }
        return doc
      }),
    )

    return documentsWithSignedUrls
  }

  /**
   * Pré-preencher campos SOAP a partir de um alerta de sinal vital
   *
   * Retorna sugestões de preenchimento baseadas no alerta:
   * - Objective (O): Dados objetivos do sinal vital anormal
   * - Assessment (A): Análise do alerta e severidade
   *
   * O profissional pode editar/completar antes de salvar
   */
  async prefillFromAlert(
    alertId: string,
    tenantId: string,
  ): Promise<{
    objective: string
    assessment: string
    residentId: string
    suggestedTags: string[]
  }> {
    // Buscar alerta com dados do sinal vital
    const alert = await this.prisma.vitalSignAlert.findFirst({
      where: {
        id: alertId,
        tenantId,
      },
      include: {
        vitalSign: true,
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    })

    if (!alert) {
      throw new NotFoundException(`Alerta ${alertId} não encontrado`)
    }

    // Construir texto objetivo (O) com dados do sinal vital
    const vitalSign = alert.vitalSign
    const objectiveParts: string[] = []

    if (vitalSign.systolicBloodPressure || vitalSign.diastolicBloodPressure) {
      objectiveParts.push(
        `PA: ${vitalSign.systolicBloodPressure || '?'}/${vitalSign.diastolicBloodPressure || '?'} mmHg`,
      )
    }
    if (vitalSign.heartRate) {
      objectiveParts.push(`FC: ${vitalSign.heartRate} bpm`)
    }
    if (vitalSign.temperature) {
      objectiveParts.push(`Tax: ${vitalSign.temperature}°C`)
    }
    if (vitalSign.oxygenSaturation) {
      objectiveParts.push(`SpO₂: ${vitalSign.oxygenSaturation}%`)
    }
    if (vitalSign.bloodGlucose) {
      objectiveParts.push(`Glicemia: ${vitalSign.bloodGlucose} mg/dL`)
    }

    const objective = `Sinais vitais aferidos em ${new Date(vitalSign.timestamp).toLocaleString('pt-BR')}:\n${objectiveParts.join('\n')}\n\nAlerta: ${alert.title}\n${alert.description}`

    // Construir avaliação (A) baseada no tipo e severidade do alerta
    let assessment = `${alert.title} - Severidade: ${alert.severity}\n\n`

    // Adicionar contexto específico por tipo de alerta
    const alertTypeMessages: Record<string, string> = {
      PRESSURE_HIGH:
        'Hipertensão arterial detectada. Avaliar sinais de cefaleia, tontura, visão turva.',
      PRESSURE_LOW:
        'Hipotensão arterial detectada. Avaliar sinais de tontura, fraqueza, confusão mental.',
      GLUCOSE_HIGH:
        'Hiperglicemia detectada. Avaliar poliúria, polidipsia, fadiga.',
      GLUCOSE_LOW:
        'Hipoglicemia detectada. Avaliar tremores, sudorese, confusão, taquicardia.',
      TEMPERATURE_HIGH:
        'Hipertermia/Febre detectada. Avaliar foco infeccioso, estado geral.',
      TEMPERATURE_LOW: 'Hipotermia detectada. Avaliar exposição ao frio, sepse.',
      OXYGEN_LOW:
        'Hipóxia detectada. Avaliar dispneia, cianose, padrão respiratório.',
      HEART_RATE_HIGH:
        'Taquicardia detectada. Avaliar ansiedade, dor, febre, desidratação.',
      HEART_RATE_LOW:
        'Bradicardia detectada. Avaliar uso de medicações, sintomas associados.',
    }

    assessment += alertTypeMessages[alert.type] || 'Avaliar quadro clínico geral.'

    // Sugerir tags baseadas no tipo de alerta
    const suggestedTags: string[] = ['Sinais Vitais Anormais']
    if (alert.severity === 'CRITICAL') {
      suggestedTags.push('Urgente')
    }
    if (alert.type.includes('PRESSURE')) {
      suggestedTags.push('Cardiovascular')
    }
    if (alert.type.includes('GLUCOSE')) {
      suggestedTags.push('Diabetes')
    }
    if (alert.type.includes('TEMPERATURE')) {
      suggestedTags.push('Infecção')
    }
    if (alert.type.includes('OXYGEN')) {
      suggestedTags.push('Respiratório')
    }

    return {
      objective,
      assessment,
      residentId: alert.residentId,
      suggestedTags,
    }
  }
}
