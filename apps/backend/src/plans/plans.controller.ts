import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Listar planos disponíveis',
    description: 'Lista todos os planos disponíveis para assinatura',
  })
  @ApiResponse({ status: 200, description: 'Lista de planos' })
  findAll() {
    return this.plansService.findAll();
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Buscar plano por ID',
    description: 'Retorna os detalhes de um plano específico',
  })
  @ApiResponse({ status: 200, description: 'Dados do plano' })
  @ApiResponse({ status: 404, description: 'Plano não encontrado' })
  findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @Get('compare/:currentId/:targetId')
  @Public()
  @ApiOperation({
    summary: 'Comparar planos',
    description: 'Compara dois planos e retorna as diferenças',
  })
  @ApiResponse({ status: 200, description: 'Comparação entre planos' })
  @ApiResponse({ status: 404, description: 'Plano não encontrado' })
  comparePlans(
    @Param('currentId') currentId: string,
    @Param('targetId') targetId: string,
  ) {
    return this.plansService.comparePlans(currentId, targetId);
  }
}