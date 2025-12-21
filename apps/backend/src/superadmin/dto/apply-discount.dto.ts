import { IsNumber, IsString, Min, Max, MinLength } from 'class-validator'

export class ApplyDiscountDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent: number

  @IsString()
  @MinLength(3)
  reason: string
}
