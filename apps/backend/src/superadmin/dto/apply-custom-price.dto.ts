import { IsNumber, IsString, Min, MinLength } from 'class-validator'

export class ApplyCustomPriceDto {
  @IsNumber()
  @Min(0)
  customPrice: number

  @IsString()
  @MinLength(3)
  reason: string
}
