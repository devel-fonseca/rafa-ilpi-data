import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { CreatePrescriptionDto } from './create-prescription.dto';

export class UpdatePrescriptionDto extends PartialType(CreatePrescriptionDto) {
  @ApiProperty({
    description: 'Motivo obrigatório da edição (mínimo 10 caracteres)',
    example: 'Correção de dosagem prescrita incorretamente',
    required: true,
  })
  @IsString()
  @MinLength(10, {
    message: 'changeReason deve ter no mínimo 10 caracteres',
  })
  changeReason: string;

  @ApiProperty({
    description: 'Status ativo/inativo da prescrição',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
