import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class PublishTermsOfServiceDto {
  @ApiProperty({
    example: '2026-01-26T12:00:00.000Z',
    description:
      'Data de vigência do termo de uso (opcional, default: agora). Versão anterior do mesmo plano será revogada nesta data.',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;
}
