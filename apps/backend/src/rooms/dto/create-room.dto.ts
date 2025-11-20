import { IsString, IsInt, IsOptional, IsBoolean, IsUUID } from 'class-validator'

export class CreateRoomDto {
  @IsString()
  name: string

  @IsUUID()
  floorId: string

  @IsOptional()
  @IsInt()
  capacity?: number

  @IsOptional()
  @IsString()
  roomType?: string

  @IsOptional()
  @IsString()
  genderRestriction?: string

  @IsOptional()
  @IsBoolean()
  hasBathroom?: boolean

  @IsOptional()
  @IsString()
  notes?: string
}
