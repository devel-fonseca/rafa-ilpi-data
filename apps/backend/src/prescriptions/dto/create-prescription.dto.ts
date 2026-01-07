import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateMedicationDto } from './create-medication.dto';
import { CreateSOSMedicationDto } from './create-sos-medication.dto';
import { IsDateOnly } from '../../common/validators/date.validators';

export class CreatePrescriptionDto {
  @ApiProperty({ description: 'ID do residente', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  residentId: string;

  @ApiProperty({ description: 'Nome do médico prescritor', example: 'Dr. João Silva' })
  @IsString()
  @IsNotEmpty()
  doctorName: string;

  @ApiProperty({ description: 'CRM do médico', example: '123456' })
  @IsString()
  @IsNotEmpty()
  doctorCrm: string;

  @ApiProperty({ description: 'UF do CRM', example: 'SP' })
  @IsString()
  @IsNotEmpty()
  doctorCrmState: string;

  @ApiProperty({ description: 'Data da prescrição (YYYY-MM-DD)', example: '2025-11-17' })
  @IsDateOnly()
  @IsNotEmpty()
  prescriptionDate: string;

  @ApiProperty({
    enum: ['ROTINA', 'ALTERACAO_PONTUAL', 'ANTIBIOTICO', 'ALTO_RISCO', 'CONTROLADO', 'OUTRO'],
    description: 'Tipo de prescrição',
    example: 'ROTINA',
  })
  @IsEnum(['ROTINA', 'ALTERACAO_PONTUAL', 'ANTIBIOTICO', 'ALTO_RISCO', 'CONTROLADO', 'OUTRO'])
  @IsNotEmpty()
  prescriptionType: string;

  @ApiProperty({
    description: 'Validade da prescrição (YYYY-MM-DD) - Obrigatório para ANTIBIOTICO e CONTROLADO',
    example: '2025-12-17',
    required: false,
  })
  @IsDateOnly()
  @IsOptional()
  validUntil?: string;

  @ApiProperty({
    description: 'Data estimada para revisão da prescrição (YYYY-MM-DD)',
    example: '2025-12-17',
    required: false,
  })
  @IsDateOnly()
  @IsOptional()
  reviewDate?: string;

  @ApiProperty({
    enum: ['BZD', 'PSICOFARMACO', 'OPIOIDE', 'ANTICONVULSIVANTE', 'OUTRO'],
    description: 'Classe do medicamento controlado (apenas para CONTROLADO)',
    required: false,
  })
  @IsEnum(['BZD', 'PSICOFARMACO', 'OPIOIDE', 'ANTICONVULSIVANTE', 'OUTRO'])
  @IsOptional()
  controlledClass?: string;

  @ApiProperty({
    description: 'Número da notificação de receita (apenas para CONTROLADO)',
    required: false,
  })
  @IsString()
  @IsOptional()
  notificationNumber?: string;

  @ApiProperty({
    enum: ['AMARELA', 'AZUL', 'BRANCA_ESPECIAL', 'NAO_APLICA'],
    description: 'Tipo de notificação (apenas para CONTROLADO)',
    required: false,
  })
  @IsEnum(['AMARELA', 'AZUL', 'BRANCA_ESPECIAL', 'NAO_APLICA'])
  @IsOptional()
  notificationType?: string;

  @ApiProperty({
    description: 'URL da imagem da receita médica (obrigatório para CONTROLADO)',
    required: false,
  })
  @IsString()
  @IsOptional()
  prescriptionImageUrl?: string;

  @ApiProperty({ description: 'Observações gerais', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    description: 'Medicamentos contínuos',
    type: [CreateMedicationDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMedicationDto)
  medications: CreateMedicationDto[];

  @ApiProperty({
    description: 'Medicações SOS',
    type: [CreateSOSMedicationDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSOSMedicationDto)
  @IsOptional()
  sosMedications?: CreateSOSMedicationDto[];
}
