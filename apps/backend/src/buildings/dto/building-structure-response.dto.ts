import { Exclude, Expose, Type } from 'class-transformer'

/**
 * DTO de resposta para dados resumidos de residente em leito
 */
@Exclude()
export class ResidentSummaryDto {
  @Expose()
  id: string

  @Expose()
  fullName: string

  @Expose()
  fotoUrl: string | null
}

/**
 * DTO de resposta para leito com informações de residente
 */
@Exclude()
export class BedResponseDto {
  @Expose()
  id: string

  @Expose()
  code: string

  @Expose()
  status: string

  @Expose()
  roomId: string

  @Expose()
  @Type(() => ResidentSummaryDto)
  resident: ResidentSummaryDto | null
}

/**
 * DTO de resposta para quarto com contagens calculadas
 */
@Exclude()
export class RoomResponseDto {
  @Expose()
  id: string

  @Expose()
  name: string

  @Expose()
  code: string | null

  @Expose()
  floorId: string

  @Expose()
  hasPrivateBathroom: boolean

  @Expose()
  isAccessible: boolean

  @Expose()
  @Type(() => BedResponseDto)
  beds: BedResponseDto[]

  @Expose()
  totalBeds: number

  @Expose()
  occupiedBeds: number
}

/**
 * DTO de resposta para andar com contagens calculadas
 */
@Exclude()
export class FloorResponseDto {
  @Expose()
  id: string

  @Expose()
  floorNumber: number

  @Expose()
  code: string | null

  @Expose()
  buildingId: string

  @Expose()
  @Type(() => RoomResponseDto)
  rooms: RoomResponseDto[]

  @Expose()
  roomsCount: number

  @Expose()
  bedsCount: number

  @Expose()
  occupiedBeds: number
}

/**
 * DTO de resposta para prédio com contagens calculadas
 */
@Exclude()
export class BuildingResponseDto {
  @Expose()
  id: string

  @Expose()
  name: string

  @Expose()
  code: string | null

  @Expose()
  tenantId: string

  @Expose()
  @Type(() => FloorResponseDto)
  floors: FloorResponseDto[]

  @Expose()
  totalFloors: number

  @Expose()
  totalRooms: number

  @Expose()
  totalBeds: number

  @Expose()
  occupiedBeds: number
}

/**
 * DTO de resposta para estatísticas globais
 */
@Exclude()
export class GlobalStatsDto {
  @Expose()
  totalBuildings: number

  @Expose()
  totalFloors: number

  @Expose()
  totalRooms: number

  @Expose()
  totalBeds: number

  @Expose()
  occupiedBeds: number

  @Expose()
  availableBeds: number

  @Expose()
  maintenanceBeds: number

  @Expose()
  reservedBeds: number

  @Expose()
  occupancyRate: number
}

/**
 * DTO de resposta completa para mapa de leitos
 */
@Exclude()
export class FullMapResponseDto {
  @Expose()
  @Type(() => BuildingResponseDto)
  buildings: BuildingResponseDto[]

  @Expose()
  @Type(() => GlobalStatsDto)
  stats: GlobalStatsDto
}
