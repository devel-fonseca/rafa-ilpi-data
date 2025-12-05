import { PartialType } from '@nestjs/swagger';
import { CreateAllergyDto } from './create-allergy.dto';

export class UpdateAllergyDto extends PartialType(CreateAllergyDto) {
  // Herda todas as propriedades como opcionais
}
