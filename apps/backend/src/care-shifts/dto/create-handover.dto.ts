import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

/**
 * DTO para criação de passagem de plantão (ShiftHandover)
 *
 * A passagem de plantão é obrigatória antes de marcar o plantão como COMPLETED.
 * Deve ser feita pelo Líder ou Suplente da equipe.
 */
export class CreateHandoverDto {
  @ApiProperty({
    description: 'Relatório da passagem de plantão',
    example:
      'Turno tranquilo. Sr. João tomou medicação às 10h. Sra. Maria reclamou de dor de cabeça às 14h, foi medicada. Todos os residentes almoçaram normalmente.',
    minLength: 50,
  })
  @IsString({ message: 'O relatório deve ser uma string' })
  @IsNotEmpty({ message: 'O relatório da passagem é obrigatório' })
  @MinLength(50, {
    message: 'O relatório deve ter pelo menos 50 caracteres',
  })
  report: string;

  @ApiPropertyOptional({
    description:
      'ID do líder/suplente do próximo turno que receberá a passagem (opcional se for o último turno do dia)',
    example: 'uuid-usuario-receptor',
  })
  @IsOptional()
  @IsUUID('4', { message: 'receivedBy deve ser um UUID válido' })
  receivedBy?: string;
}
