import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteMessageDto {
  @ApiProperty({
    description: 'Motivo da exclusão',
    example: 'Mensagem enviada por engano',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  deleteReason: string;
}
