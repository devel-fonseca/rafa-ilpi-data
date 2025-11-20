import { IsString, IsOptional, IsUUID } from 'class-validator'

export class CreateBedDto {
  @IsString()
  code: string

  @IsUUID()
  roomId: string

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsString()
  notes?: string
}
