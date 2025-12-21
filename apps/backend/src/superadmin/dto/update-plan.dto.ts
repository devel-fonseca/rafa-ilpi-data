import { IsOptional, IsNumber, IsString, IsBoolean, IsObject, Min } from 'class-validator'

export class UpdatePlanDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsers?: number

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxResidents?: number

  @IsOptional()
  @IsString()
  displayName?: string

  @IsOptional()
  @IsObject()
  features?: object

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean

  @IsOptional()
  @IsNumber()
  @Min(0)
  trialDays?: number
}
