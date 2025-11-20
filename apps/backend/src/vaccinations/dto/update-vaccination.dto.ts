import { PartialType } from '@nestjs/mapped-types';
import { CreateVaccinationDto } from './create-vaccination.dto';

/**
 * DTO para atualização de registro de vacinação
 * Estende CreateVaccinationDto tornando todos os campos opcionais
 */
export class UpdateVaccinationDto extends PartialType(CreateVaccinationDto) {}
