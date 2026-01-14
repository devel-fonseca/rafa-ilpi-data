import { IsString, IsOptional, MinLength, IsDateString } from 'class-validator';

export class ReserveBedDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'O nome do futuro residente deve ter no mínimo 3 caracteres' })
  futureResidentName?: string;

  @IsOptional()
  @IsDateString()
  expectedAdmissionDate?: string;

  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'As observações devem ter no mínimo 10 caracteres' })
  notes?: string;
}
