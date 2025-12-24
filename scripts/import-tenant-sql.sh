#!/bin/bash

##
# Script para importar backup CSV de tenant usando COPY do PostgreSQL
# Uso: ./scripts/import-tenant-sql.sh
##

set -e  # Parar em caso de erro

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups/tenant_test_prod/backup_casa_sao_rafael_20251222_125203"
DB_USER="rafa_user"
DB_PASS="rafa_pass_dev"
DB_HOST="localhost"
DB_PORT="5433"
DB_NAME="rafa_ilpi"

export PGPASSWORD=$DB_PASS

echo "🚀 Iniciando importação de backup do tenant via SQL..."
echo ""

# Desabilitar triggers e constraints temporariamente
echo "⚙️  Desabilitando constraints temporariamente..."
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "SET session_replication_role = replica;" 2>/dev/null
echo ""

# 1. Tenant
echo "📦 [1/10] Importando tenant..."
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "\COPY tenants(id,name,slug,cnpj,email,phone,status,\"schemaName\",\"addressCity\",\"addressDistrict\",\"addressNumber\",\"addressComplement\",\"addressState\",\"addressZipCode\",\"deletedAt\",\"createdAt\",\"updatedAt\",\"addressStreet\") FROM '${BACKUP_DIR}/01_tenant.csv' WITH CSV HEADER"
echo "✅ Tenant importado"
echo ""

# 2. Criar schema
echo "🏗️  [2/10] Criando schema PostgreSQL..."
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "CREATE SCHEMA IF NOT EXISTS casa_sao_rafael"
echo "✅ Schema criado"
echo ""

# 3. Users
echo "👥 [3/10] Importando usuários..."
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "\COPY users FROM '${BACKUP_DIR}/02_users.csv' WITH CSV HEADER"
echo "✅ Usuários importados"
echo ""

# 4. User Profiles
echo "📋 [4/10] Importando perfis de usuários..."
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "\COPY user_profiles FROM '${BACKUP_DIR}/03_user_profiles.csv' WITH CSV HEADER"
echo "✅ Perfis importados"
echo ""

# 5. Buildings
echo "🏢 [5/10] Importando prédios..."
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "\COPY buildings FROM '${BACKUP_DIR}/10_buildings.csv' WITH CSV HEADER"
echo "✅ Prédios importados"
echo ""

# 6. Beds
echo "🛏️  [6/10] Importando leitos..."
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "\COPY beds FROM '${BACKUP_DIR}/09_beds.csv' WITH CSV HEADER"
echo "✅ Leitos importados"
echo ""

# 7. Residents
echo "👴 [7/10] Importando residentes..."
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "\COPY residents FROM '${BACKUP_DIR}/04_residents.csv' WITH CSV HEADER"
echo "✅ Residentes importados"
echo ""

# 8. Prescriptions
echo "💊 [8/10] Importando prescrições..."
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "\COPY prescriptions FROM '${BACKUP_DIR}/06_prescriptions.csv' WITH CSV HEADER"
echo "✅ Prescrições importadas"
echo ""

# 9. Vital Signs
echo "❤️  [9/10] Importando sinais vitais..."
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "\COPY vital_signs FROM '${BACKUP_DIR}/08_vital_signs.csv' WITH CSV HEADER"
echo "✅ Sinais vitais importados"
echo ""

# 10. Daily Records
echo "📝 [10/10] Importando registros diários..."
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "\COPY daily_records FROM '${BACKUP_DIR}/05_daily_records.csv' WITH CSV HEADER"
echo "✅ Registros diários importados"
echo ""

echo "🎉 Importação concluída com sucesso!"
echo ""
echo "📊 Estatísticas:"
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "
SELECT
  (SELECT COUNT(*) FROM tenants WHERE id = '23edffd0-4942-4b54-8d07-e41a9630a9bb') as tenants,
  (SELECT COUNT(*) FROM users WHERE \"tenantId\" = '23edffd0-4942-4b54-8d07-e41a9630a9bb') as users,
  (SELECT COUNT(*) FROM residents WHERE \"tenantId\" = '23edffd0-4942-4b54-8d07-e41a9630a9bb') as residents,
  (SELECT COUNT(*) FROM beds WHERE \"tenantId\" = '23edffd0-4942-4b54-8d07-e41a9630a9bb') as beds,
  (SELECT COUNT(*) FROM buildings WHERE \"tenantId\" = '23edffd0-4942-4b54-8d07-e41a9630a9bb') as buildings;
"

unset PGPASSWORD
