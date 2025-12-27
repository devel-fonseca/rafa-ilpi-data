import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { EmailTemplatesService } from './email-templates.service';
import {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  PreviewEmailTemplateDto,
  SendTestEmailDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('email-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin') // Apenas superadmin pode acessar
export class EmailTemplatesController {
  constructor(private readonly emailTemplatesService: EmailTemplatesService) {}

  @Get()
  async findAll() {
    return this.emailTemplatesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.emailTemplatesService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateEmailTemplateDto) {
    return this.emailTemplatesService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateEmailTemplateDto) {
    return this.emailTemplatesService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.emailTemplatesService.delete(id);
    return { success: true };
  }

  @Get(':id/versions')
  async getVersionHistory(@Param('id') id: string) {
    return this.emailTemplatesService.getVersionHistory(id);
  }

  @Post(':id/rollback/:versionId')
  async rollbackToVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.emailTemplatesService.rollbackToVersion(id, versionId);
  }

  @Post('preview')
  async previewTemplate(@Body() dto: PreviewEmailTemplateDto) {
    const html = await this.emailTemplatesService.previewTemplate(dto);
    return { html };
  }

  @Post(':id/test-send')
  async sendTestEmail(@Param('id') id: string, @Body() dto: SendTestEmailDto) {
    const success = await this.emailTemplatesService.sendTestEmail(
      id,
      dto.to,
      dto.variables,
    );
    return { success };
  }
}
