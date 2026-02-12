import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionType } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { PermissionsGuard } from '../../permissions/guards/permissions.guard';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator';
import {
  CreateCategoryDto,
  QueryCategoriesDto,
  UpdateCategoryDto,
} from '../dto';
import { FinancialCategoriesService } from '../services/financial-categories.service';

@ApiTags('Financial Operations - Categories')
@ApiBearerAuth()
@Controller('financial/categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinancialCategoriesController {
  constructor(private readonly categoriesService: FinancialCategoriesService) {}

  @Post()
  @RequirePermissions(PermissionType.MANAGE_FINANCIAL_CATEGORIES)
  @ApiOperation({ summary: 'Criar categoria financeira' })
  @ApiResponse({ status: 201, description: 'Categoria criada com sucesso' })
  create(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.categoriesService.create(dto, user.id);
  }

  @Get()
  @RequirePermissions(PermissionType.VIEW_FINANCIAL_OPERATIONS)
  @ApiOperation({ summary: 'Listar categorias financeiras' })
  findAll(@Query() query: QueryCategoriesDto) {
    return this.categoriesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_FINANCIAL_OPERATIONS)
  @ApiOperation({ summary: 'Buscar categoria financeira por ID' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionType.MANAGE_FINANCIAL_CATEGORIES)
  @ApiOperation({ summary: 'Atualizar categoria financeira' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.categoriesService.update(id, dto, user.id);
  }

  @Delete(':id')
  @RequirePermissions(PermissionType.MANAGE_FINANCIAL_CATEGORIES)
  @ApiOperation({ summary: 'Remover categoria financeira (soft delete)' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.categoriesService.remove(id, user.id);
  }
}
