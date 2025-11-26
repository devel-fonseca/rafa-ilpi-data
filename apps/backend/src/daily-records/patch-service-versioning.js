/**
 * Script para aplicar patch de versionamento no daily-records.service.ts
 *
 * Alterações:
 * 1. Atualizar método update() com versionamento
 * 2. Atualizar método remove() com motivo obrigatório
 * 3. Adicionar método getHistory()
 */

const fs = require('fs');
const path = require('path');

const servicePath = path.join(__dirname, 'daily-records.service.ts');
let content = fs.readFileSync(servicePath, 'utf8');

// 1. Atualizar assinatura do método update
content = content.replace(
  /async update\(\s*id: string,\s*dto: UpdateDailyRecordDto,\s*tenantId: string,\s*userId: string,\s*\) \{/,
  `async update(
    id: string,
    dto: UpdateDailyRecordDto,
    tenantId: string,
    userId: string,
    userName: string,
  ) {`
);

// 2. Substituir todo o corpo do método update
const updateMethodPattern = /(async update\([^)]+\) \{[\s\S]*?)(\/\/ Verificar se registro existe[\s\S]*?return updated;\s*\})/;
const newUpdateBody = `// Verificar se registro existe e pertence ao tenant
    const existing = await this.prisma.dailyRecord.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Registro não encontrado');
    }

    // Se time foi fornecido, validar formato
    if (dto.time) {
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(dto.time)) {
        throw new BadRequestException('Formato de hora inválido. Use HH:mm');
      }
    }

    // Calcular próximo número de versão
    const lastVersion = await this.prisma.dailyRecordHistory.findFirst({
      where: { recordId: id },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const nextVersionNumber = (lastVersion?.versionNumber || 0) + 1;

    // Preparar dados novos (apenas campos que foram enviados)
    const newData: any = {};
    if (dto.type !== undefined) newData.type = dto.type;
    if (dto.date !== undefined) newData.date = dto.date;
    if (dto.time !== undefined) newData.time = dto.time;
    if (dto.data !== undefined) newData.data = dto.data;
    if (dto.recordedBy !== undefined) newData.recordedBy = dto.recordedBy;
    if (dto.notes !== undefined) newData.notes = dto.notes;

    // Identificar campos alterados
    const changedFields: string[] = [];
    Object.keys(newData).forEach((key) => {
      if (JSON.stringify(existing[key]) !== JSON.stringify(newData[key])) {
        changedFields.push(key);
      }
    });

    // Criar snapshot do estado anterior
    const previousSnapshot = {
      type: existing.type,
      date: existing.date,
      time: existing.time,
      data: existing.data,
      recordedBy: existing.recordedBy,
      notes: existing.notes,
      updatedAt: existing.updatedAt,
    };

    // Usar transação para garantir consistência
    const result = await this.prisma.$transaction(async (prisma) => {
      // 1. Salvar versão anterior no histórico
      await prisma.dailyRecordHistory.create({
        data: {
          recordId: id,
          tenantId,
          versionNumber: nextVersionNumber,
          previousData: previousSnapshot,
          newData,
          changedFields,
          changeType: 'UPDATE',
          changeReason: dto.editReason,
          changedBy: userId,
          changedByName: userName,
        },
      });

      // 2. Atualizar registro
      const updated = await prisma.dailyRecord.update({
        where: { id },
        data: {
          type: dto.type as any,
          date: dto.date ? new Date(dto.date) : undefined,
          time: dto.time,
          data: dto.data as any,
          recordedBy: dto.recordedBy,
          notes: dto.notes,
        },
        include: {
          resident: {
            select: {
              id: true,
              fullName: true,
              fotoUrl: true,
            },
          },
        },
      });

      return updated;
    });

    this.logger.info('Registro diário atualizado com versionamento', {
      recordId: id,
      versionNumber: nextVersionNumber,
      changedFields,
      reason: dto.editReason,
      tenantId,
      userId,
    });

    return result;
  }`;

content = content.replace(updateMethodPattern, `$1${newUpdateBody}`);

// 3. Atualizar método remove
const removeMethodPattern = /(async remove\()id: string, tenantId: string, userId: string(\) \{[\s\S]*?return \{ message:[\s\S]*?\};\s*\})/;
const newRemoveSignature = `async remove(
    id: string,
    deleteDto: { deleteReason: string },
    tenantId: string,
    userId: string,
    userName: string,
  ) {
    // Verificar se registro existe e pertence ao tenant
    const existing = await this.prisma.dailyRecord.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Registro não encontrado');
    }

    // Calcular próximo número de versão
    const lastVersion = await this.prisma.dailyRecordHistory.findFirst({
      where: { recordId: id },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const nextVersionNumber = (lastVersion?.versionNumber || 0) + 1;

    // Snapshot do estado final antes de deletar
    const finalSnapshot = {
      type: existing.type,
      date: existing.date,
      time: existing.time,
      data: existing.data,
      recordedBy: existing.recordedBy,
      notes: existing.notes,
      updatedAt: existing.updatedAt,
    };

    // Usar transação
    await this.prisma.$transaction(async (prisma) => {
      // 1. Salvar no histórico antes de deletar
      await prisma.dailyRecordHistory.create({
        data: {
          recordId: id,
          tenantId,
          versionNumber: nextVersionNumber,
          previousData: finalSnapshot,
          newData: { deleted: true },
          changedFields: ['deletedAt'],
          changeType: 'DELETE',
          changeReason: deleteDto.deleteReason,
          changedBy: userId,
          changedByName: userName,
        },
      });

      // 2. Soft delete
      await prisma.dailyRecord.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });
    });

    this.logger.info('Registro diário removido (soft delete) com versionamento', {
      recordId: id,
      versionNumber: nextVersionNumber,
      reason: deleteDto.deleteReason,
      tenantId,
      userId,
    });

    return { message: 'Registro removido com sucesso' };
  }`;

content = content.replace(removeMethodPattern, newRemoveSignature);

// 4. Adicionar método getHistory antes do último método (validate)
const beforeValidatePattern = /(\/\*\*\s*\n\s*\* Busca o último registro[\s\S]*?\n\s*async findLatestByResidents)/;
const getHistoryMethod = `/**
   * Busca o histórico de versões de um registro
   */
  async getHistory(id: string, tenantId: string) {
    // Verificar se registro existe
    const record = await this.prisma.dailyRecord.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
        type: true,
      },
    });

    if (!record) {
      throw new NotFoundException('Registro não encontrado');
    }

    // Buscar histórico ordenado por versão (mais recente primeiro)
    const history = await this.prisma.dailyRecordHistory.findMany({
      where: {
        recordId: id,
        tenantId,
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    return {
      recordId: id,
      recordType: record.type,
      totalVersions: history.length,
      history,
    };
  }

  $1`;

content = content.replace(beforeValidatePattern, getHistoryMethod);

// Salvar arquivo atualizado
fs.writeFileSync(servicePath, content, 'utf8');
console.log('✅ Service atualizado com sucesso!');
