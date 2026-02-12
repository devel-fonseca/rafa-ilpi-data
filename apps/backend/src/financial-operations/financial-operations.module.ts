import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { FinancialAccountsController } from './controllers/financial-accounts.controller';
import { FinancialCategoriesController } from './controllers/financial-categories.controller';
import { FinancialPaymentMethodsController } from './controllers/financial-payment-methods.controller';
import { FinancialReferenceDataController } from './controllers/financial-reference-data.controller';
import { FinancialReconciliationsController } from './controllers/financial-reconciliations.controller';
import { FinancialTransactionsController } from './controllers/financial-transactions.controller';
import { FinancialAccountsService } from './services/financial-accounts.service';
import { FinancialCategoriesService } from './services/financial-categories.service';
import { FinancialPaymentMethodsService } from './services/financial-payment-methods.service';
import { FinancialReferenceDataService } from './services/financial-reference-data.service';
import { FinancialReconciliationsService } from './services/financial-reconciliations.service';
import { FinancialContractTransactionsService } from './services/financial-contract-transactions.service';
import { FinancialTransactionsService } from './services/financial-transactions.service';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [
    FinancialCategoriesController,
    FinancialTransactionsController,
    FinancialReferenceDataController,
    FinancialAccountsController,
    FinancialPaymentMethodsController,
    FinancialReconciliationsController,
  ],
  providers: [
    FinancialAccountsService,
    FinancialCategoriesService,
    FinancialTransactionsService,
    FinancialContractTransactionsService,
    FinancialReferenceDataService,
    FinancialPaymentMethodsService,
    FinancialReconciliationsService,
  ],
  exports: [
    FinancialAccountsService,
    FinancialCategoriesService,
    FinancialTransactionsService,
    FinancialContractTransactionsService,
    FinancialReferenceDataService,
    FinancialPaymentMethodsService,
    FinancialReconciliationsService,
  ],
})
export class FinancialOperationsModule {}
