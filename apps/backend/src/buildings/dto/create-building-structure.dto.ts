import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, IsBoolean } from 'class-validator'
import { Type } from 'class-transformer'

class BedConfig {
  @IsOptional()
  @IsString()
  code?: string
}

class RoomConfig {
  @IsString()
  roomName: string

  @IsOptional()
  @IsString()
  roomCode?: string

  @IsNumber()
  bedCount: number

  @IsOptional()
  @IsBoolean()
  hasPrivateBathroom?: boolean

  @IsOptional()
  @IsBoolean()
  isAccessible?: boolean

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BedConfig)
  beds?: BedConfig[]
}

class FloorConfig {
  @IsNumber()
  floorNumber: number

  @IsOptional()
  @IsString()
  floorCode?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomConfig)
  rooms: RoomConfig[]
}

export class CreateBuildingStructureDto {
  @IsString()
  buildingName: string

  @IsOptional()
  @IsString()
  buildingCode?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FloorConfig)
  floors: FloorConfig[]
}
