import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
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
  constructor(private readonly prisma: PrismaService) {}

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
    // Buscar positionCode do usuário
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { positionCode: true },
    })

    if (!user) {
      throw new NotFoundException('Usuário não encontrado')
    }

    // Verificar se o cargo está habilitado para registrar a profissão
    const profession = createDto.profession as ClinicalProfession
    if (!isAuthorizedForProfession(user.positionCode, profession)) {
      throw new ForbiddenException(
        getUnauthorizedMessage(user.positionCode, profession),
      )
    }

    // Calcular noteDate (default: now)
    const noteDate = createDto.noteDate ? new Date(createDto.noteDate) : new Date()

    // Calcular editableUntil (noteDate + 12 horas)
    const editableUntil = new Date(noteDate.getTime() + 12 * 60 * 60 * 1000)

    // Criar evolução clínica
    return this.prisma.clinicalNote.create({
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
      },
    })

    if (!note) {
      throw new NotFoundException('Evolução clínica não encontrada')
    }

    return note
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
        },
      }),
      this.prisma.clinicalNote.count({ where }),
    ])

    return {
      data,
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
        },
      }),
      this.prisma.clinicalNote.count({ where }),
    ])

    return { data, total }
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
    // Buscar positionCode do usuário
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { positionCode: true },
    })

    if (!user) {
      throw new NotFoundException('Usuário não encontrado')
    }

    // Verificar se o cargo está habilitado para a profissão da evolução
    const profession = note.profession as unknown as ClinicalProfession
    if (!isAuthorizedForProfession(user.positionCode, profession)) {
      throw new ForbiddenException(
        getUnauthorizedMessage(user.positionCode, profession),
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
}
