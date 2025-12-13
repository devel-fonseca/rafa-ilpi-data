import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { CreateVaccinationDto } from './create-vaccination.dto';

/**
 * DTO para atualização de registro de vacinação com versionamento
 * Estende CreateVaccinationDto tornando todos os campos opcionais
 * Conformidade: RDC 502/2021 - Requer motivo obrigatório para alterações
 */
export class UpdateVaccinationDto extends PartialType(CreateVaccinationDto) {
  @ApiProperty({
    description:
      'Motivo obrigatório da alteração do registro de vacinação (para conformidade com RDC 502/2021)',
    example: 'Correção de lote do imunizante conforme carteira de vacinação atualizada',
    minLength: 10,
  })
  @IsString({ message: 'Motivo da alteração deve ser um texto' })
  @MinLength(10, {
    message: 'Motivo da alteração deve ter pelo menos 10 caracteres',
  })
  changeReason: string;
}
