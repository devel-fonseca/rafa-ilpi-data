-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'BASICO', 'PROFISSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED', 'TRIAL');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MASCULINO', 'FEMININO', 'OUTRO', 'NAO_INFORMADO');

-- CreateEnum
CREATE TYPE "CivilStatus" AS ENUM ('SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL');

-- CreateEnum
CREATE TYPE "BloodType" AS ENUM ('A_POSITIVO', 'A_NEGATIVO', 'B_POSITIVO', 'B_NEGATIVO', 'AB_POSITIVO', 'AB_NEGATIVO', 'O_POSITIVO', 'O_NEGATIVO', 'NAO_INFORMADO');

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PlanType" NOT NULL,
    "maxResidents" INTEGER NOT NULL,
    "maxUsers" INTEGER NOT NULL,
    "priceMonthly" DECIMAL(10,2) NOT NULL,
    "features" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cnpj" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL',
    "schemaName" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "residents" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "rg" TEXT,
    "orgaoExpedidor" TEXT,
    "cns" TEXT,
    "genero" "Gender" NOT NULL,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "estadoCivil" "CivilStatus",
    "naturalidade" TEXT,
    "nacionalidade" TEXT NOT NULL DEFAULT 'Brasileira',
    "nomeMae" TEXT,
    "nomePai" TEXT,
    "fotoUrl" TEXT,
    "docPessoaisUrl" TEXT,
    "cnsCardUrl" TEXT,
    "enderecoAtual" TEXT,
    "bairroAtual" TEXT,
    "cidadeAtual" TEXT,
    "estadoAtual" TEXT,
    "cepAtual" TEXT,
    "pontoReferenciaAtual" TEXT,
    "enderecoOrigem" TEXT,
    "bairroOrigem" TEXT,
    "cidadeOrigem" TEXT,
    "estadoOrigem" TEXT,
    "cepOrigem" TEXT,
    "contatoEmergenciaNome" TEXT,
    "contatoEmergenciaParentesco" TEXT,
    "contatoEmergenciaTelefone" TEXT,
    "contatoEmergenciaEmail" TEXT,
    "responsavelLegalNome" TEXT,
    "responsavelLegalCpf" TEXT,
    "responsavelLegalRg" TEXT,
    "responsavelLegalTelefone" TEXT,
    "responsavelLegalEmail" TEXT,
    "responsavelLegalEndereco" TEXT,
    "responsavelLegalParentesco" TEXT,
    "responsavelDocumentosUrl" TEXT,
    "dataAdmissao" TIMESTAMP(3) NOT NULL,
    "motivoAdmissao" TEXT,
    "observacoesAdmissao" TEXT,
    "termoAdmissaoUrl" TEXT,
    "consentimentoLgpdUrl" TEXT,
    "consentimentoImagemUrl" TEXT,
    "comprovanteEnderecoUrl" TEXT,
    "tipoSanguineo" "BloodType" NOT NULL DEFAULT 'NAO_INFORMADO',
    "altura" DECIMAL(5,2),
    "peso" DECIMAL(5,2),
    "dependenciaFisica" TEXT,
    "dependenciaMental" TEXT,
    "medicamentosUso" TEXT,
    "alergias" TEXT,
    "doencasCronicas" TEXT,
    "observacoesSaude" TEXT,
    "laudoMedicoUrl" TEXT,
    "temPlanoSaude" BOOLEAN NOT NULL DEFAULT false,
    "planoSaudeNome" TEXT,
    "planoSaudeNumero" TEXT,
    "planoSaudeValidade" TIMESTAMP(3),
    "planoSaudeCarteiraUrl" TEXT,
    "pertencesLista" JSONB,
    "pertencesObservacoes" TEXT,
    "quartoNumero" TEXT,
    "leitoNumero" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "dataSaida" TIMESTAMP(3),
    "motivoSaida" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "residents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "plans_type_key" ON "plans"("type");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_cnpj_key" ON "tenants"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_schemaName_key" ON "tenants"("schemaName");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_tenantId_key" ON "subscriptions"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "residents_cpf_key" ON "residents"("cpf");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
