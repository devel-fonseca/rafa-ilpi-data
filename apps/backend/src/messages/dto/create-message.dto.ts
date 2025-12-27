import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '@prisma/client';

export class CreateMessageDto {
  @ApiProperty({
    enum: MessageType,
    description: 'Tipo da mensagem',
    example: 'DIRECT',
  })
  @IsEnum(MessageType)
  @IsNotEmpty()
  type: MessageType;

  @ApiProperty({
    description: 'Assunto da mensagem',
    example: 'Reunião sobre novo residente',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  subject: string;

  @ApiProperty({
    description: 'Corpo da mensagem',
    example: 'Prezados, gostaria de agendar uma reunião...',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  body: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'IDs dos destinatários (obrigatório para DIRECT, ignorado para BROADCAST)',
    example: ['uuid-1', 'uuid-2'],
  })
  @ValidateIf((o) => o.type === MessageType.DIRECT)
  @IsArray()
  @IsUUID(4, { each: true })
  @IsNotEmpty()
  recipientIds?: string[];

  @ApiPropertyOptional({
    description: 'ID da mensagem original (se for resposta)',
    example: 'uuid-thread',
  })
  @IsOptional()
  @IsUUID()
  threadId?: string;
}
