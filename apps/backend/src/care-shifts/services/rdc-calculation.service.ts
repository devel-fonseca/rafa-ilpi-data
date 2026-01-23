import { Injectable, Scope, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { parseISO } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../prisma/tenant-context.service';
import {
  RDCCalculationResult,
  ShiftRDCCalculation,
  ResidentsByDependencyLevel,
  CoverageReportResult,
  ShiftCoverageReport,
} from '../interfaces';

/**
 * Service para cálculo RDC 502/2021 - Dimensionamento de Cuidadores
 *
 * Regras (Art. 16, II - RDC 502/2021):
 * - Grau I (8h): 1 cuidador para cada 20 residentes (carga diária)
 * - Grau I (12h): 1 cuidador para cada 10 residentes (por turno)
 * - Grau II (8h/12h): 1 cuidador para cada 10 residentes (por turno)
 * - Grau III (8h/12h): 1 cuidador para cada 6 residentes (por turno)
 *
 * IMPORTANTE: Residentes sem grau de dependência NÃO entram no cálculo (apenas alerta)
 */
@Injectable({ scope: Scope.REQUEST })
export class RDCCalculationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Calcular mínimo de cuidadores exigido pela RDC 502/2021 para uma data específica
   *
   * @param date - Data no formato YYYY-MM-DD (campo DATE)
   * @param shiftTemplateId - ID do turno específico (opcional, se não fornecido calcula para todos)
   * @returns Resultado do cálculo com mínimo exigido por turno
   */
  async calculateMinimumCaregiversRDC(
    date: string,
    shiftTemplateId?: string,
  ): Promise<RDCCalculationResult> {
    // Converter string para DateTime (Prisma espera DateTime mesmo para @db.Date)
    // Garantir formato YYYY-MM-DD antes de adicionar tempo
    const cleanDate = date.split('T')[0]; // Remove qualquer parte de tempo se existir
    const dateObj = parseISO(`${cleanDate}T12:00:00.000`);

    // 1. Buscar residentes ativos na data
    const residents = await this.tenantContext.client.resident.findMany({
      where: {
        status: 'Ativo',
        deletedAt: null,
        // Residente deve ter sido admitido até a data consultada
        admissionDate: { lte: dateObj },
        // Se tem data de saída, deve ser após a data consultada
        OR: [
          { dischargeDate: null },
          { dischargeDate: { gt: dateObj } },
        ],
      },
      select: {
        id: true,
        dependencyLevel: true,
      },
    });

    // 2. Classificar residentes por grau de dependência
    const residentsByLevel = this.classifyResidentsByDependency(residents);

    // 3. Buscar turnos habilitados para o tenant
    const shiftTemplates = await this.getEnabledShiftTemplates(shiftTemplateId);

    // 4. Calcular mínimo exigido para cada turno
    const calculations: ShiftRDCCalculation[] = shiftTemplates.map((template) =>
      this.calculateForShiftTemplate(template, residentsByLevel),
    );

    // 5. Gerar warnings
    const warnings: string[] = [];
    if (residentsByLevel.withoutLevel > 0) {
      warnings.push(
        `${residentsByLevel.withoutLevel} residente(s) sem grau de dependência. NÃO foram incluídos no cálculo RDC.`,
      );
    }

    return {
      date,
      calculations,
      warnings,
      totalResidents: residentsByLevel,
    };
  }

  /**
   * Gerar relatório de cobertura para um período
   *
   * @param startDate - Data inicial (YYYY-MM-DD)
   * @param endDate - Data final (YYYY-MM-DD)
   * @returns Relatório de cobertura com status de conformidade
   */
  async generateCoverageReport(
    startDate: string,
    endDate: string,
  ): Promise<CoverageReportResult> {
    // Converter strings para DateTime (Prisma espera DateTime mesmo para @db.Date)
    // Garantir formato YYYY-MM-DD antes de adicionar tempo
    const cleanStartDate = startDate.split('T')[0];
    const cleanEndDate = endDate.split('T')[0];
    const startDateObj = parseISO(`${cleanStartDate}T12:00:00.000`);
    const endDateObj = parseISO(`${cleanEndDate}T12:00:00.000`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validar que startDate não é maior que endDate
    if (startDateObj > endDateObj) {
      throw new BadRequestException(
        'A data inicial não pode ser posterior à data final',
      );
    }

    // Validar que o período não ultrapassa 60 dias
    const daysDiff = Math.ceil(
      (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysDiff > 60) {
      throw new BadRequestException(
        'O período máximo para relatório de cobertura é de 60 dias',
      );
    }

    // Validar que as datas são do passado (não pode incluir hoje ou futuro)
    if (startDateObj >= today || endDateObj >= today) {
      throw new BadRequestException(
        'O relatório de cobertura só pode ser gerado para datas passadas',
      );
    }

    // 1. Buscar plantões do período
    const shifts = await this.tenantContext.client.shift.findMany({
      where: {
        date: {
          gte: startDateObj,
          lte: endDateObj,
        },
        deletedAt: null,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            members: {
              where: { removedAt: null },
              select: {
                userId: true,
                role: true,
              },
            },
          },
        },
        members: {
          where: { removedAt: null },
          select: {
            userId: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Buscar usuários únicos de todos os shifts
    const allUserIds = [
      ...new Set(shifts.flatMap((s) => s.members.map((m) => m.userId))),
    ];
    const users = await this.tenantContext.client.user.findMany({
      where: { id: { in: allUserIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    // Enriquecer com ShiftTemplates do public schema (fallback)
    const shiftTemplateIds = [...new Set(shifts.map((s) => s.shiftTemplateId))];
    const shiftTemplates = await this.prisma.shiftTemplate.findMany({
      where: { id: { in: shiftTemplateIds } },
    });
    const shiftTemplateMap = new Map(shiftTemplates.map((st) => [st.id, st]));

    // Buscar configurações customizadas do tenant (primária)
    const tenantConfigs =
      await this.tenantContext.client.tenantShiftConfig.findMany({
        where: {
          shiftTemplateId: { in: shiftTemplateIds },
          deletedAt: null,
        },
      });
    const configMap = new Map(tenantConfigs.map((c) => [c.shiftTemplateId, c]));

    const enrichedShifts = shifts.map((shift) => {
      const template = shiftTemplateMap.get(shift.shiftTemplateId);
      const config = configMap.get(shift.shiftTemplateId);

      return {
        ...shift,
        shiftTemplate: template
          ? {
              id: template.id,
              type: template.type,
              name: config?.customName || template.name,
              startTime: config?.customStartTime || template.startTime,
              endTime: config?.customEndTime || template.endTime,
              duration: config?.customDuration || template.duration,
              description: template.description,
              isActive: template.isActive,
              displayOrder: template.displayOrder,
            }
          : undefined,
      };
    });

    // Ordenar por data e depois por displayOrder do shiftTemplate
    enrichedShifts.sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      return (a.shiftTemplate?.displayOrder || 0) - (b.shiftTemplate?.displayOrder || 0);
    });

    // 2. Para cada dia do período, calcular mínimo RDC
    const shiftReports: ShiftCoverageReport[] = [];
    const dateMap = new Map<string, RDCCalculationResult>();

    for (const shift of enrichedShifts) {
      // Normalizar data: pode vir como Date object ou string
      const dateStr = shift.date instanceof Date
        ? shift.date.toISOString().split('T')[0]
        : (shift.date as string).split('T')[0];

      // Calcular RDC para esta data (cache para evitar recalcular)
      if (!dateMap.has(dateStr)) {
        const rdcResult = await this.calculateMinimumCaregiversRDC(dateStr);
        dateMap.set(dateStr, rdcResult);
      }

      const rdcResult = dateMap.get(dateStr)!;
      const rdcCalc = rdcResult.calculations.find(
        (c) => c.shiftTemplate.id === shift.shiftTemplateId,
      );

      if (!rdcCalc) continue; // Turno desabilitado, ignorar

      const assignedCount = shift.members.length;
      const complianceStatus = this.getComplianceStatus(
        assignedCount,
        rdcCalc.minimumRequired,
      );

      // Mapear membros com suas funções na equipe
      const teamMembersMap = new Map(
        enrichedShifts
          .find((s) => s.date === shift.date && s.shiftTemplateId === shift.shiftTemplateId)
          ?.team?.members?.map((tm: { userId: string; role: string | null }) => [
            tm.userId,
            tm.role,
          ]) || [],
      );

      shiftReports.push({
        date: dateStr,
        shiftTemplate: {
          id: shift.shiftTemplate?.id || shift.shiftTemplateId,
          name: shift.shiftTemplate?.name || 'Turno desconhecido',
          startTime: shift.shiftTemplate?.startTime || '00:00',
          endTime: shift.shiftTemplate?.endTime || '00:00',
        },
        minimumRequired: rdcCalc.minimumRequired,
        assignedCount,
        complianceStatus,
        team: shift.team
          ? { id: shift.team.id, name: shift.team.name }
          : undefined,
        members: shift.members.map((m) => ({
          userId: m.userId,
          userName: userMap.get(m.userId) || 'Nome não disponível',
          teamFunction: teamMembersMap.get(m.userId) || null,
        })),
      });
    }

    // 3. Calcular summary
    const summary = {
      totalShifts: shiftReports.length,
      compliant: shiftReports.filter((s) => s.complianceStatus === 'compliant')
        .length,
      attention: shiftReports.filter((s) => s.complianceStatus === 'attention')
        .length,
      nonCompliant: shiftReports.filter(
        (s) => s.complianceStatus === 'non_compliant',
      ).length,
    };

    return {
      startDate,
      endDate,
      shifts: shiftReports,
      summary,
    };
  }

  /**
   * Classificar residentes por grau de dependência
   */
  private classifyResidentsByDependency(
    residents: { id: string; dependencyLevel: string | null }[],
  ): ResidentsByDependencyLevel {
    const result: ResidentsByDependencyLevel = {
      grauI: 0,
      grauII: 0,
      grauIII: 0,
      withoutLevel: 0,
    };

    for (const resident of residents) {
      if (!resident.dependencyLevel) {
        result.withoutLevel++;
        continue;
      }

      const level = resident.dependencyLevel.toLowerCase();

      if (level.includes('grau i') && !level.includes('grau ii') && !level.includes('grau iii')) {
        result.grauI++;
      } else if (level.includes('grau ii')) {
        result.grauII++;
      } else if (level.includes('grau iii')) {
        result.grauIII++;
      } else {
        // Formato não reconhecido, considerar sem grau
        result.withoutLevel++;
      }
    }

    return result;
  }

  /**
   * Buscar turnos habilitados para o tenant
   */
  private async getEnabledShiftTemplates(shiftTemplateId?: string) {
    const where: Prisma.ShiftTemplateWhereInput = { isActive: true };
    if (shiftTemplateId) {
      where.id = shiftTemplateId;
    }

    // Buscar templates do public schema
    const templates = await this.tenantContext.publicClient.shiftTemplate.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
    });

    // Buscar configurações do tenant separadamente (cross-schema)
    const tenantConfigs = await this.tenantContext.client.tenantShiftConfig.findMany({
      where: {
        shiftTemplateId: { in: templates.map((t) => t.id) },
        deletedAt: null,
      },
    });

    const configMap = new Map(tenantConfigs.map((c) => [c.shiftTemplateId, c]));

    // Filtrar apenas habilitados no tenant
    return templates.filter((template) => {
      const tenantConfig = configMap.get(template.id);
      if (!tenantConfig) return true; // Sem config = habilitado por padrão
      return tenantConfig.isEnabled;
    });
  }

  /**
   * Calcular mínimo exigido para um turno específico
   */
  private calculateForShiftTemplate(
    template: Prisma.ShiftTemplateGetPayload<Record<string, never>>,
    residents: ResidentsByDependencyLevel,
  ): ShiftRDCCalculation {
    const { grauI, grauII, grauIII } = residents;
    let minimumRequired = 0;

    if (template.duration === 8) {
      // Turnos de 8h:
      // - Grau I: carga diária (÷20)
      // - Grau II/III: por turno (÷10, ÷6)
      minimumRequired =
        Math.ceil(grauI / 20) +
        Math.ceil(grauII / 10) +
        Math.ceil(grauIII / 6);
    } else {
      // Turnos de 12h:
      // - Todos por turno
      minimumRequired =
        Math.ceil(grauI / 10) +
        Math.ceil(grauII / 10) +
        Math.ceil(grauIII / 6);
    }

    return {
      shiftTemplate: {
        id: template.id,
        type: template.type,
        name: template.name,
        startTime: template.startTime,
        endTime: template.endTime,
        duration: template.duration,
      },
      minimumRequired,
      residents: {
        grauI,
        grauII,
        grauIII,
        withoutLevel: residents.withoutLevel,
      },
    };
  }

  /**
   * Determinar status de conformidade
   */
  private getComplianceStatus(
    assignedCount: number,
    minimumRequired: number,
  ): 'compliant' | 'attention' | 'non_compliant' {
    if (assignedCount === 0) return 'non_compliant'; // 🔴 Vermelho
    if (assignedCount < minimumRequired) return 'attention'; // 🟡 Amarelo
    return 'compliant'; // 🟢 Verde
  }
}
