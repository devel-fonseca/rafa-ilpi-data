import { PartialType } from '@nestjs/swagger';
import { CreateClinicalProfileDto } from './create-clinical-profile.dto';

export class UpdateClinicalProfileDto extends PartialType(
  CreateClinicalProfileDto,
) {
  // Herda todas as propriedades como opcionais
}
