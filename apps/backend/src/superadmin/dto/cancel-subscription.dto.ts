import { IsString, IsNotEmpty, MinLength } from 'class-validator'

export class CancelSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Motivo deve ter pelo menos 10 caracteres' })
  reason: string
}
