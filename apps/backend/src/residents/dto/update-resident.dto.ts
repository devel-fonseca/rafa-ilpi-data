import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { CreateResidentDto } from './create-resident.dto';

/**
 * DTO para atualização de residente
 * Todos os campos do CreateResidentDto são herdados como opcionais através do PartialType
 *
 * IMPORTANTE: Usar PartialType do @nestjs/swagger para herdar os transforms do class-transformer
 * (como @EmptyToUndefined) além dos decorators de validação
 */
export class UpdateResidentDto extends PartialType(CreateResidentDto) {
  // Todos os campos são herdados automaticamente de CreateResidentDto como opcionais

  /**
   * Motivo da alteração (obrigatório conforme RDC 502/2021 Art. 39)
   * Mínimo de 10 caracteres para garantir rastreabilidade adequada
   */
  @ApiProperty({
    example: 'Atualização do endereço conforme solicitação da família',
    description: 'Motivo obrigatório da alteração (mínimo 10 caracteres)',
    minLength: 10,
  })
  @IsString({ message: 'changeReason deve ser uma string' })
  @IsNotEmpty({ message: 'changeReason é obrigatório' })
  @MinLength(10, { message: 'changeReason deve ter no mínimo 10 caracteres' })
  changeReason: string;
}
