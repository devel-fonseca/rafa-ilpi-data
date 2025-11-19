import { PartialType } from '@nestjs/swagger';
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
}
