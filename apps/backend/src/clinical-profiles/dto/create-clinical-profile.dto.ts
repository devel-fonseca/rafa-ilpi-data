import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateClinicalProfileDto {
  @ApiProperty({
    description: 'ID do residente',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  residentId: string;

  @ApiPropertyOptional({
    description: 'Estado de saúde atual',
    example: 'Estável, sem intercorrências',
  })
  @IsOptional()
  @IsString()
  healthStatus?: string;

  @ApiPropertyOptional({
    description: 'Necessidades especiais',
    example: 'Requer auxílio para deambulação',
  })
  @IsOptional()
  @IsString()
  specialNeeds?: string;

  @ApiPropertyOptional({
    description: 'Aspectos funcionais',
    example: 'Grau II de dependência, mobilidade reduzida',
  })
  @IsOptional()
  @IsString()
  functionalAspects?: string;
}
