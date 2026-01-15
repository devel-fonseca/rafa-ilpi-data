#!/bin/bash
# Script para refatorar ResidentsService - substituir padrões multi-tenancy

FILE="apps/backend/src/residents/residents.service.ts"

echo "🔧 Refatorando ResidentsService..."

# 1. Substituir this.prisma.resident por this.tenantContext.client.resident
sed -i 's/this\.prisma\.resident/this.tenantContext.client.resident/g' "$FILE"

# 2. Substituir this.prisma.bed por this.tenantContext.client.bed
sed -i 's/this\.prisma\.bed/this.tenantContext.client.bed/g' "$FILE"

# 3. Substituir this.prisma.room por this.tenantContext.client.room
sed -i 's/this\.prisma\.room/this.tenantContext.client.room/g' "$FILE"

# 4. Substituir this.prisma.residentHistory por this.tenantContext.client.residentHistory
sed -i 's/this\.prisma\.residentHistory/this.tenantContext.client.residentHistory/g' "$FILE"

# 5. Substituir this.prisma.$transaction por this.tenantContext.client.$transaction
sed -i 's/this\.prisma\.\$transaction/this.tenantContext.client.\$transaction/g' "$FILE"

# 6. Substituir this.prisma.bedStatusHistory por this.tenantContext.client.bedStatusHistory
sed -i 's/this\.prisma\.bedStatusHistory/this.tenantContext.client.bedStatusHistory/g' "$FILE"

# 7. Remover where: { tenantId, -> where: {
# (mais complexo, precisa ser manual ou com regex mais sofisticado)

echo "✅ Substituições automáticas concluídas"
echo "⚠️  Ainda é necessário:"
echo "   1. Remover filtros 'tenantId' dos where clauses"
echo "   2. Adicionar 'tenantId: this.tenantContext.tenantId' nos creates"
echo "   3. Substituir referências soltas a 'tenantId' por 'this.tenantContext.tenantId'"
