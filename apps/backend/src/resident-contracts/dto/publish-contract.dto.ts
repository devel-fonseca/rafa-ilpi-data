import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class PublishContractDto {
  @ApiProperty({
    example: '2025-12-22T12:00:00.000Z',
    description:
      'Data de vigência do contrato (opcional, default: agora). Versão anterior do mesmo plano será revogada nesta data.',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;
}
