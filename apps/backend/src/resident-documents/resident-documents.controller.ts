import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  Req,
  UseGuards,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResidentDocumentsService } from './resident-documents.service';
import { CreateResidentDocumentDto } from './dto/create-resident-document.dto';
import { UpdateResidentDocumentDto } from './dto/update-resident-document.dto';
import { Request } from 'express';
import { AuditAction, AuditEntity } from '../audit/audit.decorator';

@ApiTags('Resident Documents')
@ApiBearerAuth()
@Controller('residents/:residentId/documents')
@UseGuards(JwtAuthGuard)
export class ResidentDocumentsController {
  constructor(private readonly documentsService: ResidentDocumentsService) {}

  /**
   * GET /residents/:residentId/documents
   * Lista todos os documentos de um residente
   */
  @Get()
  @ApiOperation({ summary: 'Listar documentos de um residente' })
  @AuditAction('READ')
  @AuditEntity('RESIDENT_DOCUMENT')
  async findAll(
    @Param('residentId') residentId: string,
    @Query('type') type: string | undefined,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.documentsService.findAll(residentId, user.tenantId, type);
  }

  /**
   * GET /residents/:residentId/documents/:id
   * Busca um documento específico
   */
  @Get(':id')
  @ApiOperation({ summary: 'Buscar um documento específico' })
  @AuditAction('READ')
  @AuditEntity('RESIDENT_DOCUMENT')
  async findOne(
    @Param('residentId') residentId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.documentsService.findOne(id, residentId, user.tenantId);
  }

  /**
   * POST /residents/:residentId/documents
   * Upload de novo documento
   */
  @Post()
  @ApiOperation({ summary: 'Fazer upload de novo documento' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'type'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        type: {
          type: 'string',
          enum: [
            'CARTAO_CONVENIO',
            'COMPROVANTE_RESIDENCIA_RESIDENTE',
            'DOCUMENTOS_RESPONSAVEL_LEGAL',
            'COMPROVANTE_RESIDENCIA_RESPONSAVEL',
            'DOCUMENTOS_PESSOAIS',
            'LAUDO_MEDICO',
            'TERMO_ADMISSAO',
            'TERMO_CONSENTIMENTO_IMAGEM',
            'TERMO_CONSENTIMENTO_LGPD',
          ],
        },
        details: {
          type: 'string',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @AuditAction('CREATE')
  @AuditEntity('RESIDENT_DOCUMENT')
  async uploadDocument(
    @Param('residentId') residentId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(pdf|jpg|jpeg|png|webp)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() metadata: CreateResidentDocumentDto,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.documentsService.uploadDocument(
      residentId,
      user.tenantId,
      user.id,
      file,
      metadata,
    );
  }

  /**
   * PATCH /residents/:residentId/documents/:id
   * Atualiza metadados do documento
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar metadados do documento' })
  @AuditAction('UPDATE')
  @AuditEntity('RESIDENT_DOCUMENT')
  async updateMetadata(
    @Param('residentId') residentId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateResidentDocumentDto,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.documentsService.updateMetadata(id, residentId, user.tenantId, updateDto);
  }

  /**
   * PATCH /residents/:residentId/documents/:id/file
   * Substitui o arquivo do documento
   */
  @Patch(':id/file')
  @ApiOperation({ summary: 'Substituir arquivo do documento' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @AuditAction('UPDATE')
  @AuditEntity('RESIDENT_DOCUMENT')
  async replaceFile(
    @Param('residentId') residentId: string,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(pdf|jpg|jpeg|png|webp)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.documentsService.replaceFile(id, residentId, user.tenantId, file);
  }

  /**
   * DELETE /residents/:residentId/documents/:id
   * Deleta um documento
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Deletar um documento' })
  @AuditAction('DELETE')
  @AuditEntity('RESIDENT_DOCUMENT')
  async deleteDocument(
    @Param('residentId') residentId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.documentsService.deleteDocument(id, residentId, user.tenantId);
  }
}
