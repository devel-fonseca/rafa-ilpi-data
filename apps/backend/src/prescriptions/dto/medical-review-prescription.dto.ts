import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateOnly } from '../../common/validators/date.validators'

export class MedicalReviewPrescriptionDto {
  @ApiProperty({
    description: 'Data da consulta médica (YYYY-MM-DD)',
    example: '2026-01-05',
  })
  @IsDateOnly()
  @IsNotEmpty()
  medicalReviewDate: string

  @ApiProperty({
    description: 'Nome do médico que revisou a prescrição',
    example: 'Dr. João Silva',
  })
  @IsString()
  @IsNotEmpty()
  reviewedByDoctor: string

  @ApiProperty({
    description: 'CRM do médico revisor',
    example: '12345',
  })
  @IsString()
  @IsNotEmpty()
  reviewDoctorCrm: string

  @ApiProperty({
    description: 'UF do CRM do médico revisor',
    example: 'SP',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 2, { message: 'UF deve ter exatamente 2 caracteres' })
  reviewDoctorState: string

  @ApiPropertyOptional({
    description: 'Nova data de revisão (YYYY-MM-DD)',
    example: '2026-04-05',
  })
  @IsDateOnly()
  @IsOptional()
  newReviewDate?: string

  @ApiProperty({
    description: 'URL da nova receita médica (upload obrigatório)',
    example: 'https://storage.example.com/prescriptions/abc123.pdf',
  })
  @IsString()
  @IsNotEmpty()
  prescriptionImageUrl: string

  @ApiProperty({
    description: 'Observações sobre a revisão médica (mínimo 10 caracteres)',
    example: 'Dr. João confirmou mesma prescrição. Residente está estável.',
  })
  @IsString()
  @MinLength(10, {
    message: 'As observações devem ter no mínimo 10 caracteres',
  })
  reviewNotes: string
}
