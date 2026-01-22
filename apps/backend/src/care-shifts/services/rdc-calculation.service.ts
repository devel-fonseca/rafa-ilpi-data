import { Injectable, Scope } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { parseISO } from 'date-fns';
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
  constructor(private readonly tenantContext: TenantContextService) {}

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
    const dateObj = parseISO(`${date}T12:00:00.000`);

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
    const startDateObj = parseISO(`${startDate}T12:00:00.000`);
    const endDateObj = parseISO(`${endDate}T12:00:00.000`);

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
        shiftTemplate: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        members: {
          where: { removedAt: null },
          select: { userId: true },
        },
      },
      orderBy: [{ date: 'asc' }, { shiftTemplate: { displayOrder: 'asc' } }],
    });

    // 2. Para cada dia do período, calcular mínimo RDC
    const shiftReports: ShiftCoverageReport[] = [];
    const dateMap = new Map<string, RDCCalculationResult>();

    for (const shift of shifts) {
      const dateStr = shift.date as unknown as string; // DATE field retorna string

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

      shiftReports.push({
        date: dateStr,
        shiftTemplate: {
          id: shift.shiftTemplate.id,
          name: shift.shiftTemplate.name,
        },
        minimumRequired: rdcCalc.minimumRequired,
        assignedCount,
        complianceStatus,
        team: shift.team || undefined,
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

    const templates = await this.tenantContext.client.shiftTemplate.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      include: {
        tenantConfigs: {
          where: {
            tenantId: this.tenantContext.tenantId,
            deletedAt: null,
          },
        },
      },
    });

    // Filtrar apenas habilitados no tenant
    return templates.filter((template) => {
      const tenantConfig = template.tenantConfigs[0];
      if (!tenantConfig) return true; // Sem config = habilitado por padrão
      return tenantConfig.isEnabled;
    });
  }

  /**
   * Calcular mínimo exigido para um turno específico
   */
  private calculateForShiftTemplate(
    template: Prisma.ShiftTemplateGetPayload<{ include: { tenantConfigs: true } }>,
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
