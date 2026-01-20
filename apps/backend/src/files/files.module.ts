import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FileProcessingService } from './file-processing.service';

@Module({
  imports: [ConfigModule],
  controllers: [FilesController],
  providers: [FilesService, FileProcessingService],
  exports: [FilesService, FileProcessingService], // Exportar para outros módulos usarem
})
export class FilesModule {}
