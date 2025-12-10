import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UploadFileDto } from './dto/upload-file.dto';

@ApiTags('files')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * POST /files/upload
   * Upload de arquivo
   */
  @ApiOperation({ summary: 'Upload de arquivo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Arquivo para upload',
    type: UploadFileDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Arquivo enviado com sucesso',
    schema: {
      example: {
        fileId: '123e4567-e89b-12d3-a456-426614174000',
        fileName: 'documento.pdf',
        fileUrl: 'tenants/tenant-123/documents/123e4567.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Arquivo inválido ou muito grande',
  })
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 1,
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('category') category: string,
    @Query('relatedId') relatedId: string,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    if (!category) {
      throw new BadRequestException('Categoria é obrigatória');
    }

    // Usar tenantId do usuário logado
    const tenantId = user.tenantId;

    return this.filesService.uploadFile(
      tenantId,
      file,
      category,
      relatedId,
    );
  }

  /**
   * GET /files/download/:filePath
   * Gerar URL de download assinada
   */
  @ApiOperation({ summary: 'Obter URL de download do arquivo' })
  @ApiParam({
    name: 'filePath',
    description: 'Caminho completo do arquivo no storage',
    example: 'tenants/tenant-123/documents/file.pdf',
  })
  @ApiResponse({
    status: 200,
    description: 'URL de download gerada com sucesso',
    schema: {
      example: {
        url: 'https://s3.rafalabs.com.br/rafa-ilpi-files/tenants/...',
        expiresIn: 3600,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Erro ao gerar URL',
  })
  @Get('download/*')
  async getFileUrl(@Param('0') filePath: string) {
    const url = await this.filesService.getFileUrl(filePath);
    return {
      url,
      expiresIn: 3600, // 1 hora
    };
  }

  /**
   * GET /files/list
   * Listar arquivos do tenant
   */
  @ApiOperation({ summary: 'Listar arquivos do tenant' })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filtrar por categoria',
    example: 'documents',
  })
  @ApiQuery({
    name: 'relatedId',
    required: false,
    description: 'Filtrar por ID relacionado',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de arquivos retornada com sucesso',
    schema: {
      example: [
        {
          fileName: 'documento.pdf',
          filePath: 'tenants/tenant-123/documents/file.pdf',
          fileSize: 1024000,
          lastModified: '2025-11-13T16:30:00.000Z',
        },
      ],
    },
  })
  @Get('list')
  async listFiles(
    @Query('category') category: string,
    @Query('relatedId') relatedId: string,
    @CurrentUser() user: any,
  ) {
    const tenantId = user.tenantId;
    return this.filesService.listFiles(tenantId, category, relatedId);
  }

  /**
   * DELETE /files/:filePath
   * Deletar arquivo
   */
  @ApiOperation({ summary: 'Deletar arquivo' })
  @ApiParam({
    name: 'filePath',
    description: 'Caminho completo do arquivo no storage',
    example: 'tenants/tenant-123/documents/file.pdf',
  })
  @ApiResponse({
    status: 200,
    description: 'Arquivo deletado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Erro ao deletar arquivo',
  })
  @Delete('*')
  async deleteFile(@Param('0') filePath: string) {
    await this.filesService.deleteFile(filePath);
    return {
      message: 'Arquivo deletado com sucesso',
    };
  }
}
