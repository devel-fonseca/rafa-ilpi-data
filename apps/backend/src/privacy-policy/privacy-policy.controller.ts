import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PrivacyPolicyService } from './privacy-policy.service';

@ApiTags('Privacy Policy')
@Controller('privacy-policy')
export class PrivacyPolicyController {
  constructor(private readonly privacyPolicyService: PrivacyPolicyService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Obter Política de Privacidade atual (público)' })
  @ApiResponse({
    status: 200,
    description: 'Política de Privacidade retornada com sucesso',
    schema: {
      properties: {
        version: { type: 'string', example: '2.1' },
        effectiveDate: { type: 'string', example: '24/12/2025' },
        lastUpdated: { type: 'string', example: '24/12/2025' },
        content: { type: 'string', description: 'Conteúdo Markdown da política' },
      },
    },
  })
  async getPrivacyPolicy() {
    return this.privacyPolicyService.getCurrentPolicy();
  }
}
