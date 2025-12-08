import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
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
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
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
  async selectTenant(@Body() selectTenantDto: SelectTenantDto) {
    return this.authService.selectTenant(selectTenantDto);
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
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto.refreshToken);
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
  async logout(@CurrentUser() user: any) {
    return this.authService.logout(user.id);
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
