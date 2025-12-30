import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SelectTenantDto } from './dto/select-tenant.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}


  /**
   * POST /auth/login
   * Login do usuário
   */
  @ApiOperation({
    summary: 'Login de usuário',
    description: 'Login de usuário. Se o usuário tem múltiplos tenants, retorna lista para seleção.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso. Retorna access token e refresh token',
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciais inválidas',
  })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  /**
   * POST /auth/select-tenant
   * Selecionar tenant específico (quando usuário tem múltiplos)
   */
  @ApiOperation({
    summary: 'Selecionar tenant',
    description: 'Seleciona um tenant específico quando o usuário tem acesso a múltiplas ILPIs',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant selecionado. Retorna access token e refresh token',
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciais inválidas',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário não encontrado no tenant especificado',
  })
  @Public()
  @Post('select-tenant')
  @HttpCode(HttpStatus.OK)
  async selectTenant(@Body() selectTenantDto: SelectTenantDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.selectTenant(selectTenantDto, ipAddress, userAgent);
  }

  /**
   * POST /auth/refresh
   * Renovar access token
   */
  @ApiOperation({ summary: 'Renovar access token usando refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Tokens renovados com sucesso',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido ou expirado',
  })
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.refresh(refreshTokenDto.refreshToken, ipAddress, userAgent);
  }

  /**
   * POST /auth/logout
   * Logout do usuário (remover refresh token)
   */
  @ApiOperation({ summary: 'Logout de usuário' })
  @ApiResponse({
    status: 200,
    description: 'Logout realizado com sucesso',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: any, @Body() logoutDto: { refreshToken?: string }, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.logout(user.id, logoutDto.refreshToken, ipAddress, userAgent);
  }

  /**
   * POST /auth/logout-expired
   * Registrar logout de sessão expirada (endpoint público)
   */
  @ApiOperation({
    summary: 'Registrar logout de sessão expirada',
    description: 'Endpoint público para registrar logout quando accessToken expirou mas refreshToken ainda é válido. Usado pelo frontend no interceptor.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout registrado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Refresh token inválido ou não encontrado',
  })
  @Post('logout-expired')
  @HttpCode(HttpStatus.OK)
  async logoutExpired(@Body() body: { refreshToken: string }, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.logoutExpired(body.refreshToken, ipAddress, userAgent);
  }

  /**
   * POST /auth/forgot-password
   * Solicitar recuperação de senha
   */
  @ApiOperation({
    summary: 'Esqueci minha senha',
    description:
      'Envia um email com link de recuperação de senha. Sempre retorna sucesso (mesmo se email não existir) por segurança.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Mensagem de confirmação enviada (sempre retorna sucesso por segurança)',
  })
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.authService.forgotPassword(forgotPasswordDto, ipAddress);
  }

  /**
   * POST /auth/reset-password
   * Resetar senha com token de recuperação
   */
  @ApiOperation({
    summary: 'Resetar senha',
    description:
      'Reseta a senha do usuário usando o token recebido por email',
  })
  @ApiResponse({
    status: 200,
    description: 'Senha alterada com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Token inválido, expirado ou já utilizado',
  })
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  /**
   * POST /auth/me
   * Retornar usuário atual
   */
  @ApiOperation({ summary: 'Obter informações do usuário autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Informações do usuário retornadas com sucesso',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('me')
  @HttpCode(HttpStatus.OK)
  async me(@CurrentUser() user: any) {
    return { user };
  }
}
