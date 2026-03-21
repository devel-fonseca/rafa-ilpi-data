import { IsString, IsOptional, IsUUID } from 'class-validator'

export class CreateBedDto {
  @IsUUID()
  roomId: string

  @IsOptional()
  @IsString()
  code?: string

  @IsOptional()
  @IsString()
  bedSuffix?: string

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsString()
  notes?: string
}
