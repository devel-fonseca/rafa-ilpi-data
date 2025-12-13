import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Users - Versionamento')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar usuário com versionamento',
    description: 'Atualiza dados de um usuário e registra a alteração no histórico de auditoria (LGPD)',
  })
  @ApiParam({ name: 'id', description: 'ID do usuário', type: 'string' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou nenhuma alteração detectada' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ) {
    return this.usersService.update(
      id,
      updateUserDto,
      req.user.tenantId,
      req.user.sub,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Excluir usuário (soft delete) com versionamento',
    description: 'Marca usuário como excluído e registra no histórico de auditoria (LGPD)',
  })
  @ApiParam({ name: 'id', description: 'ID do usuário', type: 'string' })
  @ApiResponse({ status: 200, description: 'Usuário excluído com sucesso' })
  @ApiResponse({ status: 400, description: 'Não é possível excluir sua própria conta' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async remove(
    @Param('id') id: string,
    @Body() deleteUserDto: DeleteUserDto,
    @Request() req: any,
  ) {
    return this.usersService.remove(
      id,
      req.user.tenantId,
      req.user.sub,
      deleteUserDto.deleteReason,
    );
  }

  @Get(':id/history')
  @ApiOperation({
    summary: 'Consultar histórico completo de alterações do usuário',
    description: 'Retorna todas as versões do usuário ordenadas da mais recente para a mais antiga',
  })
  @ApiParam({ name: 'id', description: 'ID do usuário', type: 'string' })
  @ApiResponse({ status: 200, description: 'Histórico consultado com sucesso' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async getHistory(@Param('id') id: string, @Request() req: any) {
    return this.usersService.getHistory(id, req.user.tenantId);
  }

  @Get(':id/history/:version')
  @ApiOperation({
    summary: 'Consultar versão específica do histórico',
    description: 'Retorna os detalhes de uma versão específica do histórico do usuário',
  })
  @ApiParam({ name: 'id', description: 'ID do usuário', type: 'string' })
  @ApiParam({ name: 'version', description: 'Número da versão', type: 'number' })
  @ApiResponse({ status: 200, description: 'Versão consultada com sucesso' })
  @ApiResponse({ status: 404, description: 'Usuário ou versão não encontrada' })
  async getHistoryVersion(
    @Param('id') id: string,
    @Param('version') version: string,
    @Request() req: any,
  ) {
    return this.usersService.getHistoryVersion(
      id,
      parseInt(version, 10),
      req.user.tenantId,
    );
  }
}
