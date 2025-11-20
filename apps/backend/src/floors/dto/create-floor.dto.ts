import { IsString, IsInt, IsOptional, IsBoolean, IsUUID } from 'class-validator'

export class CreateFloorDto {
  @IsString()
  name: string

  @IsInt()
  orderIndex: number

  @IsUUID()
  buildingId: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true
}
