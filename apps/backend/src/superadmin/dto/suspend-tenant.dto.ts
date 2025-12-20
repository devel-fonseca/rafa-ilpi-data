import { IsString, IsNotEmpty, MinLength } from 'class-validator'

export class SuspendTenantDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Motivo deve ter pelo menos 10 caracteres' })
  reason: string
}
