import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({
    description: 'Categoria do arquivo (ex: resident_photo, document, contract)',
    example: 'resident_photo',
  })
  @IsNotEmpty()
  @IsString()
  category: string;

  @ApiProperty({
    description: 'ID do registro relacionado (ex: ID do residente)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  relatedId?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Arquivo a ser enviado',
  })
  file: any;
}
