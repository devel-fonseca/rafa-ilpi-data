import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO aninhado para os horários das 6 refeições
 */
export class MealTimesDto {
  @ApiProperty({
    description: 'Horário do café da manhã',
    example: '07:00',
  })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Café da manhã deve estar no formato HH:mm',
  })
  cafeDaManha: string;

  @ApiProperty({
    description: 'Horário da colação',
    example: '09:30',
  })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Colação deve estar no formato HH:mm',
  })
  colacao: string;

  @ApiProperty({
    description: 'Horário do almoço',
    example: '12:00',
  })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Almoço deve estar no formato HH:mm',
  })
  almoco: string;

  @ApiProperty({
    description: 'Horário do lanche',
    example: '15:00',
  })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Lanche deve estar no formato HH:mm',
  })
  lanche: string;

  @ApiProperty({
    description: 'Horário do jantar',
    example: '18:00',
  })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Jantar deve estar no formato HH:mm',
  })
  jantar: string;

  @ApiProperty({
    description: 'Horário da ceia',
    example: '20:00',
  })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Ceia deve estar no formato HH:mm',
  })
  ceia: string;
}

/**
 * DTO para atualizar configuração de alimentação (atualiza 6 configs em batch)
 */
export class UpdateAlimentacaoConfigDto {
  @ApiProperty({
    description: 'Horários das 6 refeições obrigatórias',
    type: MealTimesDto,
  })
  @ValidateNested()
  @Type(() => MealTimesDto)
  @IsObject()
  mealTimes: MealTimesDto;

  @ApiProperty({
    description: 'Indica se as configurações estarão ativas',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Observações gerais sobre alimentação',
    example: 'Residente necessita dieta pastosa',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
