import { IsString, IsInt, IsOptional, IsBoolean, IsUUID } from 'class-validator'

export class CreateRoomDto {
  @IsString()
  name: string

  @IsString()
  code: string

  @IsString()
  roomNumber: string

  @IsUUID()
  floorId: string

  @IsInt()
  capacity: number

  @IsString()
  roomType: string

  @IsOptional()
  @IsBoolean()
  hasPrivateBathroom?: boolean

  @IsOptional()
  @IsBoolean()
  accessible?: boolean

  @IsOptional()
  @IsString()
  observations?: string

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
