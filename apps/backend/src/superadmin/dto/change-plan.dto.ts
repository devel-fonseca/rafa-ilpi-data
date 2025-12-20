import { IsString, IsNotEmpty, IsUUID, IsOptional, MinLength } from 'class-validator'

export class ChangePlanDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  newPlanId: string

  @IsOptional()
  @IsString()
  @MinLength(10)
  reason?: string
}
