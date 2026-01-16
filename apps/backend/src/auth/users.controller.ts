import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtPayload } from './interfaces/jwt-payload.interface';

interface RequestWithUser extends Request {
  user: JwtPayload;
}

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
    @Request() req: RequestWithUser,
  ) {
    return this.usersService.update(
      id,
      updateUserDto,
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
    @Request() req: RequestWithUser,
  ) {
    return this.usersService.remove(
      id,
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
  async getHistory(@Param('id') id: string) {
    return this.usersService.getHistory(id);
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
  ) {
    return this.usersService.getHistoryVersion(
      id,
      parseInt(version, 10),
    );
  }

  @Patch(':id/change-password')
  @ApiOperation({
    summary: 'Trocar senha do usuário',
    description: 'Permite ao usuário trocar sua própria senha fornecendo a senha atual',
  })
  @ApiParam({ name: 'id', description: 'ID do usuário', type: 'string' })
  @ApiResponse({ status: 200, description: 'Senha alterada com sucesso' })
  @ApiResponse({ status: 400, description: 'Senha atual incorreta' })
  @ApiResponse({ status: 403, description: 'Você só pode alterar sua própria senha' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @Request() req: RequestWithUser,
  ) {
    return this.usersService.changePassword(
      id,
      changePasswordDto,
      req.user.sub,
    );
  }

  // ==================== ACTIVE SESSIONS ====================

  @Get(':id/sessions')
  @ApiOperation({
    summary: 'Listar sessões ativas do usuário',
    description: 'Retorna todas as sessões ativas (refresh tokens não expirados) do usuário',
  })
  @ApiParam({ name: 'id', description: 'ID do usuário', type: 'string' })
  @ApiResponse({ status: 200, description: 'Lista de sessões ativas retornada com sucesso' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async getActiveSessions(
    @Param('id') id: string,
  ) {
    // Nota: não temos como pegar o currentTokenId do JWT payload diretamente
    // Vamos retornar todas as sessões e o frontend identifica pela data/hora mais recente
    return this.usersService.getActiveSessions(
      id,
      undefined,
    );
  }

  @Delete(':id/sessions/:sessionId')
  @ApiOperation({
    summary: 'Revogar sessão específica',
    description: 'Encerra uma sessão específica do usuário (deleta o refresh token)',
  })
  @ApiParam({ name: 'id', description: 'ID do usuário', type: 'string' })
  @ApiParam({ name: 'sessionId', description: 'ID da sessão (refresh token)', type: 'string' })
  @ApiResponse({ status: 200, description: 'Sessão encerrada com sucesso' })
  @ApiResponse({ status: 400, description: 'Não é possível revogar a sessão atual' })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada' })
  async revokeSession(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.usersService.revokeSession(
      id,
      sessionId,
      'current', // Placeholder - usuário não deve revogar sessão que está usando
    );
  }

  @Delete(':id/sessions')
  @ApiOperation({
    summary: 'Revogar todas as outras sessões',
    description: 'Encerra todas as sessões do usuário exceto a atual',
  })
  @ApiParam({ name: 'id', description: 'ID do usuário', type: 'string' })
  @ApiResponse({ status: 200, description: 'Sessões encerradas com sucesso' })
  async revokeAllOtherSessions(
    @Param('id') id: string,
  ) {
    return this.usersService.revokeAllOtherSessions(
      id,
      'current', // Placeholder
    );
  }

  // ==================== ACCESS LOGS ====================

  @Get(':id/access-logs')
  @ApiOperation({
    summary: 'Listar logs de acesso do usuário',
    description: 'Retorna histórico de logins, logouts, alterações de senha e sessões revogadas',
  })
  @ApiParam({ name: 'id', description: 'ID do usuário', type: 'string' })
  @ApiResponse({ status: 200, description: 'Logs de acesso retornados com sucesso' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async getAccessLogs(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('action') action?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 30;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    return this.usersService.getAccessLogs(
      id,
      limitNum,
      offsetNum,
      action,
    );
  }
}
