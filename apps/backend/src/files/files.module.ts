import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [ConfigModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService], // Exportar para outros módulos usarem
})
export class FilesModule {}
