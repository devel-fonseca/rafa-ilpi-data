import { Module } from '@nestjs/common';
import { ResidentDocumentsController } from './resident-documents.controller';
import { ResidentDocumentsService } from './resident-documents.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [PrismaModule, FilesModule],
  controllers: [ResidentDocumentsController],
  providers: [ResidentDocumentsService],
  exports: [ResidentDocumentsService],
})
export class ResidentDocumentsModule {}
