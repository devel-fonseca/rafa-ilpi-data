#!/usr/bin/env python3
"""
Script para refatorar referências a tenantId no ResidentsService
Substitui parâmetros 'tenantId: string' e usos soltos de 'tenantId' por 'this.tenantContext.tenantId'
"""
import re

file_path = 'apps/backend/src/residents/residents.service.ts'

with open(file_path, 'r') as f:
    content = f.read()

# 1. Remover parâmetro tenantId: string, de métodos privados
content = re.sub(r'(\w+)\(\s*([^)]*?),?\s*tenantId:\s*string,?\s*([^)]*?)\)', r'\1(\2 \3)', content)

# 2. Substituir where: { tenantId, -> where: {
content = re.sub(r'where:\s*\{\s*tenantId,', 'where: {', content)

# 3. Substituir where: { id: X, tenantId, -> where: { id: X,
content = re.sub(r'(where:\s*\{[^}]*?),\s*tenantId,', r'\1,', content)

# 4. Substituir usos soltos de tenantId (não em declarações) por this.tenantContext.tenantId
# Casos: await this.updateBedStatus(oldBedId, 'Disponível', tenantId);
content = re.sub(r'([,\(\s])tenantId([,\)\s;])', r'\1this.tenantContext.tenantId\2', content)

# 5. Substituir await this.prisma.tenant.findUnique({ where: { id: tenantId } })
# (tenant é tabela SHARED, deve usar this.prisma)
content = re.sub(
    r'this\.tenantContext\.client\.tenant',
    'this.prisma.tenant',
    content
)

# 6. Remover linhas com apenas tenantId, dentro de where clauses
lines = content.split('\n')
output_lines = []
skip_next_comma = False

for i, line in enumerate(lines):
    # Se a linha é apenas "tenantId," dentro de um where/data
    if re.match(r'^\s*tenantId,?\s*$', line):
        skip_next_comma = True
        continue
    output_lines.append(line)

content = '\n'.join(output_lines)

# Salvar
with open(file_path, 'w') as f:
    f.write(content)

print("✅ Refatoração automática de tenantId concluída")
print("⚠️  Revise manualmente:")
print("   - Adicione 'tenantId: this.tenantContext.tenantId' em creates")
print("   - Verifique se não quebrou nada")
