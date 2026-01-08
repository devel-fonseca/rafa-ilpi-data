import { PartialType, OmitType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsBoolean, IsOptional } from 'class-validator';
import { CreateClinicalProfileDto } from './create-clinical-profile.dto';

export class UpdateClinicalProfileDto extends PartialType(
  OmitType(CreateClinicalProfileDto, ['residentId'] as const),
) {
  @ApiPropertyOptional({
    description: 'Necessita auxílio para mobilidade (atualiza também o campo no cadastro do residente)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  mobilityAid?: boolean;

  @ApiProperty({
    description: 'Motivo obrigatório da alteração (mínimo 10 caracteres)',
    example: 'Atualização do perfil clínico após avaliação multidisciplinar',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, {
    message: 'O motivo da alteração deve ter no mínimo 10 caracteres',
  })
  changeReason: string;
}
