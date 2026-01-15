import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

/**
 * DTO para validação pública de contrato por hash SHA-256
 */
export class ValidateContractDto {
  @ApiProperty({
    example: 'a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1',
    description: 'Hash SHA-256 do PDF processado (64 caracteres hexadecimais)',
  })
  @IsString()
  @Length(64, 64, { message: 'Hash deve ter exatamente 64 caracteres (SHA-256)' })
  hash: string;
}
