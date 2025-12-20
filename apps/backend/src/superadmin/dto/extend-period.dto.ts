import { IsInt, Min, Max } from 'class-validator'

export class ExtendPeriodDto {
  @IsInt()
  @Min(1, { message: 'Período mínimo é 1 dia' })
  @Max(365, { message: 'Período máximo é 365 dias' })
  days: number
}
