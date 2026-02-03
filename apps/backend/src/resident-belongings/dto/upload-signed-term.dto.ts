import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

export class UploadSignedTermDto {
  @ApiProperty({
    description: 'URL do arquivo assinado no storage',
    example: 'https://minio.example.com/bucket/terms/signed-term-123.pdf',
  })
  @IsString()
  signedFileUrl: string;

  @ApiProperty({
    description: 'Chave do arquivo no storage (para deleção)',
    example: 'terms/signed-term-123.pdf',
  })
  @IsString()
  signedFileKey: string;

  @ApiProperty({
    description: 'Nome original do arquivo',
    example: 'termo-assinado-joao.pdf',
  })
  @IsString()
  @MaxLength(255)
  signedFileName: string;

  @ApiProperty({
    required: false,
    description: 'Tamanho do arquivo em bytes',
    example: 1024000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  signedFileSize?: number;

  @ApiProperty({
    required: false,
    description: 'Hash SHA-256 do arquivo para verificação de integridade',
    example: 'a1b2c3d4e5f6...',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  signedFileHash?: string;
}
