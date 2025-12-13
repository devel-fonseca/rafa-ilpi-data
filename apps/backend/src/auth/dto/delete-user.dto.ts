import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class DeleteUserDto {
  @ApiProperty({
    description:
      'Motivo obrigatório da exclusão do usuário (para conformidade com LGPD)',
    example: 'Usuário desligado da instituição conforme solicitação de RH',
    minLength: 10,
  })
  @IsString({ message: 'Motivo da exclusão deve ser um texto' })
  @MinLength(10, {
    message: 'Motivo da exclusão deve ter pelo menos 10 caracteres',
  })
  deleteReason: string;
}
