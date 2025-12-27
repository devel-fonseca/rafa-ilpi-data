import { IsOptional, IsArray, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MarkAsReadDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'IDs das mensagens a marcar como lidas (vazio = todas)',
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  messageIds?: string[];
}
