import { PartialType } from '@nestjs/mapped-types';
import { CreateResidentDto } from './create-resident.dto';

/**
 * DTO para atualização de residente
 * Todos os campos do CreateResidentDto são herdados como opcionais através do PartialType
 */
export class UpdateResidentDto extends PartialType(CreateResidentDto) {
  // Todos os campos são herdados automaticamente de CreateResidentDto como opcionais
}
