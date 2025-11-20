import { IsString, IsInt, IsOptional, IsBoolean, IsUUID } from 'class-validator'

export class CreateFloorDto {
  @IsString()
  name: string

  @IsString()
  code: string

  @IsInt()
  floorNumber: number

  @IsUUID()
  buildingId: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true
}
