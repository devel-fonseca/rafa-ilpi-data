import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AttachContractFileDto {
  @ApiProperty({
    required: false,
    description: 'Observação opcional para anexar arquivo posteriormente',
    example: 'Arquivo anexado após cadastro inicial.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

