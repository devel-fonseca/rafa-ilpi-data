import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle, minutes } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { SelectTenantDto } from './dto/select-tenant.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ReauthenticateDto } from './dto/reauthenticate.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { Request, Response } from 'express';
import {
  clearRefreshTokenCookie,
  resolveRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from './auth-cookie.util';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}


  /**
   * POST /auth/login
   * Login do usuário
   */
  @ApiOperation({
    summary: 'Login de usuário',
    description:
      'Login de usuário. Se o usuário tem múltiplos tenants, retorna lista para seleção. ' +
      'Em caso de login direto, o refresh token é entregue em cookie httpOnly.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Login realizado com sucesso. Retorna access token no body e refresh token em cookie httpOnly',
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciais inválidas',
  })
  @Public()
  @Throttle({ default: { limit: 5, ttl: minutes(1) } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.login(loginDto, ipAddress, userAgent);

    if ('refreshToken' in result && result.refreshToken) {
      setRefreshTokenCookie(response, this.configService, result.refreshToken);
      const { refreshToken: _refreshToken, ...sanitizedResult } = result;
      return sanitizedResult;
    }

    return result;
  }

  /**
   * POST /auth/select-tenant
   * Selecionar tenant específico (quando usuário tem múltiplos)
   */
  @ApiOperation({
    summary: 'Selecionar tenant',
    description:
      'Seleciona um tenant específico quando o usuário tem acesso a múltiplas ILPIs. ' +
      'O refresh token é entregue em cookie httpOnly.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Tenant selecionado. Retorna access token no body e refresh token em cookie httpOnly',
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
  @Throttle({ default: { limit: 5, ttl: minutes(1) } })
  @Post('select-tenant')
  @HttpCode(HttpStatus.OK)
  async selectTenant(
    @Body() selectTenantDto: SelectTenantDto,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.selectTenant(
      selectTenantDto,
      ipAddress,
      userAgent,
    );

    setRefreshTokenCookie(response, this.configService, result.refreshToken);
    const { refreshToken: _refreshToken, ...sanitizedResult } = result;
    return sanitizedResult;
  }

  /**
   * POST /auth/refresh
   * Renovar access token
   */
  @ApiOperation({
    summary: 'Renovar access token usando refresh token',
    description:
      'Renova a sessão usando o refresh token armazenado em cookie httpOnly. ' +
      'Mantém compatibilidade temporária com refresh token no body.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Sessão renovada com sucesso. Retorna novo access token no body e rotaciona o refresh token em cookie httpOnly',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido ou expirado',
  })
  @Public()
  @Throttle({ default: { limit: 20, ttl: minutes(1) } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const refreshToken = resolveRefreshTokenFromRequest(
      req,
      this.configService,
      refreshTokenDto.refreshToken,
    );

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token ausente');
    }

    const result = await this.authService.refresh(
      refreshToken,
      ipAddress,
      userAgent,
    );

    setRefreshTokenCookie(response, this.configService, result.refreshToken);
    const { refreshToken: _refreshToken, ...sanitizedResult } = result;
    return sanitizedResult;
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
  async logout(
    @CurrentUser() user: JwtPayload,
    @Body() logoutDto: LogoutDto & { reason?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const refreshToken = resolveRefreshTokenFromRequest(
      req,
      this.configService,
      logoutDto.refreshToken,
    );

    const result = await this.authService.logout(
      user.id,
      refreshToken,
      ipAddress,
      userAgent,
      logoutDto.reason,
    );

    clearRefreshTokenCookie(response, this.configService);
    return result;
  }

  /**
   * POST /auth/logout-expired
   * Registrar logout de sessão expirada (endpoint público)
   */
  @ApiOperation({
    summary: 'Registrar logout de sessão expirada',
    description:
      'Endpoint público para registrar logout quando accessToken expirou mas o refresh token em cookie ainda é válido. ' +
      'Usado pelo frontend no interceptor.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout registrado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Refresh token inválido ou não encontrado',
  })
  @Public()
  @Throttle({ default: { limit: 10, ttl: minutes(1) } })
  @Post('logout-expired')
  @HttpCode(HttpStatus.OK)
  async logoutExpired(
    @Body() body: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const refreshToken = resolveRefreshTokenFromRequest(
      req,
      this.configService,
      body.refreshToken,
    );

    clearRefreshTokenCookie(response, this.configService);

    if (!refreshToken) {
      return { message: 'Logout registrado' };
    }

    return this.authService.logoutExpired(refreshToken, ipAddress, userAgent);
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
  @Throttle({ default: { limit: 5, ttl: minutes(1) } })
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
  @Throttle({ default: { limit: 5, ttl: minutes(1) } })
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
  async me(@CurrentUser() user: JwtPayload) {
    return { user };
  }

  /**
   * POST /auth/reauthenticate
   * Gerar token de reautenticação para operações de alto risco
   */
  @ApiOperation({
    summary: 'Reautenticar para operações de alto risco',
    description:
      'Valida a senha do usuário logado e retorna um token de reautenticação válido por 5 minutos. ' +
      'Este token deve ser enviado no header X-Reauth-Token para executar operações críticas como exclusões, ' +
      'exportações de dados sensíveis e alterações estruturais.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reautenticação bem-sucedida. Retorna token válido por 5 minutos',
    schema: {
      type: 'object',
      properties: {
        reauthToken: {
          type: 'string',
          description: 'Token de reautenticação (JWT)',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        expiresIn: {
          type: 'number',
          description: 'Tempo de validade em segundos',
          example: 300,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Senha incorreta ou usuário não autenticado',
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: minutes(1) } })
  @Post('reauthenticate')
  @HttpCode(HttpStatus.OK)
  async reauthenticate(
    @CurrentUser() user: JwtPayload,
    @Body() reauthenticateDto: ReauthenticateDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.reauthenticate(
      user.id,
      reauthenticateDto.password,
      ipAddress,
      userAgent,
    );
  }
}
