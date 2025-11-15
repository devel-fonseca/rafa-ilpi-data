import { IsOptional, IsString, IsEnum, IsNumberString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryResidentDto {
  @ApiPropertyOptional({ description: 'Buscar por nome (parcial)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar por status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filtrar por gênero' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: 'Data de admissão inicial (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dataAdmissaoInicio?: string;

  @ApiPropertyOptional({ description: 'Data de admissão final (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dataAdmissaoFim?: string;

  @ApiPropertyOptional({ description: 'Idade mínima' })
  @IsOptional()
  @IsNumberString()
  idadeMinima?: string;

  @ApiPropertyOptional({ description: 'Idade máxima' })
  @IsOptional()
  @IsNumberString()
  idadeMaxima?: string;

  @ApiPropertyOptional({ description: 'Página para paginação', default: 1 })
  @IsOptional()
  @IsNumberString()
  page?: string = '1';

  @ApiPropertyOptional({ description: 'Limite de itens por página', default: 10 })
  @IsOptional()
  @IsNumberString()
  limit?: string = '10';

  @ApiPropertyOptional({ description: 'Campo para ordenação', default: 'fullName' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'fullName';

  @ApiPropertyOptional({ description: 'Direção da ordenação (asc ou desc)', default: 'asc' })
  @IsOptional()
  @IsEnum(['asc', 'desc', 'ASC', 'DESC'])
  sortOrder?: string = 'asc';
}