import { api } from '../services/api'

// ==================== TIPOS ====================

export interface Building {
  id: string
  name: string
  code: string
  description?: string
  totalFloors?: number
  totalRooms?: number
  totalBeds?: number
  occupiedBeds?: number
  availableBeds?: number
  createdAt: string
  updatedAt: string
}

export interface Floor {
  id: string
  buildingId: string
  building?: Building
  name: string
  code: string
  floorNumber: number
  description?: string
  roomsCount?: number
  bedsCount?: number
  occupiedBeds?: number
  availableBeds?: number
  createdAt: string
  updatedAt: string
}

export interface Room {
  id: string
  floorId: string
  floor?: Floor
  name: string
  code: string
  roomNumber: string
  roomType: 'INDIVIDUAL' | 'DUPLO' | 'TRIPLO' | 'COLETIVO'
  capacity: number
  totalBeds?: number
  occupiedBeds?: number
  availableBeds?: number
  hasPrivateBathroom?: boolean
  accessible?: boolean
  observations?: string
  createdAt: string
  updatedAt: string
}

export interface Bed {
  id: string
  roomId: string
  room?: Room
  code: string
  bedNumber: string
  status: 'DISPONIVEL' | 'OCUPADO' | 'MANUTENCAO' | 'RESERVADO'
  residentId?: string
  resident?: {
    id: string
    fullName: string
    fotoUrl?: string
  }
  occupiedSince?: string
  observations?: string
  createdAt: string
  updatedAt: string
}

// ==================== DTOs ====================

export interface CreateBuildingDto {
  name: string
  code: string
  description?: string
}

export interface UpdateBuildingDto {
  name?: string
  code?: string
  description?: string
}

export interface CreateFloorDto {
  buildingId: string
  name: string
  code: string
  floorNumber: number
  description?: string
}

export interface UpdateFloorDto {
  name?: string
  code?: string
  floorNumber?: number
  description?: string
}

export interface CreateRoomDto {
  floorId: string
  name: string
  code: string
  roomNumber: string
  roomType: 'INDIVIDUAL' | 'DUPLO' | 'TRIPLO' | 'COLETIVO'
  capacity: number
  hasPrivateBathroom?: boolean
  accessible?: boolean
  observations?: string
}

export interface UpdateRoomDto {
  name?: string
  code?: string
  roomNumber?: string
  roomType?: 'INDIVIDUAL' | 'DUPLO' | 'TRIPLO' | 'COLETIVO'
  capacity?: number
  hasPrivateBathroom?: boolean
  accessible?: boolean
  observations?: string
}

export interface CreateBedDto {
  roomId: string
  code: string
  bedNumber: string
  status?: 'DISPONIVEL' | 'OCUPADO' | 'MANUTENCAO' | 'RESERVADO'
  observations?: string
}

export interface UpdateBedDto {
  code?: string
  bedNumber?: string
  status?: 'DISPONIVEL' | 'OCUPADO' | 'MANUTENCAO' | 'RESERVADO'
  residentId?: string
  observations?: string
}

export interface AssignBedDto {
  bedId: string
  residentId: string
}

export interface ReserveBedDto {
  futureResidentName?: string
  expectedAdmissionDate?: string
  notes?: string
}

export interface BlockBedDto {
  reason: string
  expectedReleaseDate?: string
}

export interface ReleaseBedDto {
  reason?: string
}

export interface BedStatusHistoryEntry {
  id: string
  tenantId: string
  bedId: string
  previousStatus: string
  newStatus: string
  reason: string | null
  metadata: any
  changedBy: string
  changedAt: string
  createdAt: string
  bed: {
    id: string
    code: string
    room: {
      id: string
      name: string
      code: string
      roomNumber: string
      floor: {
        id: string
        name: string
        code: string
        building: {
          id: string
          name: string
          code: string
        }
      }
    }
  }
  user: {
    id: string
    name: string
    email: string
  }
}

export interface BedsHierarchy {
  buildings: Array<
    Building & {
      floors: Array<
        Floor & {
          rooms: Array<
            Room & {
              beds: Bed[]
            }
          >
        }
      >
    }
  >
  stats: {
    totalBuildings: number
    totalFloors: number
    totalRooms: number
    totalBeds: number
    occupiedBeds: number
    availableBeds: number
    maintenanceBeds: number
    reservedBeds: number
  }
}

// ==================== API CLASS ====================

class BedsAPI {
  // BUILDINGS
  async getAllBuildings(): Promise<Building[]> {
    const response = await api.get('/buildings')
    return response.data.data
  }

  async getBuildingById(id: string): Promise<Building> {
    const response = await api.get(`/buildings/${id}`)
    return response.data
  }

  async createBuilding(data: CreateBuildingDto): Promise<Building> {
    const response = await api.post('/buildings', data)
    return response.data
  }

  async updateBuilding(id: string, data: UpdateBuildingDto): Promise<Building> {
    const response = await api.patch(`/buildings/${id}`, data)
    return response.data
  }

  async deleteBuilding(id: string): Promise<void> {
    await api.delete(`/buildings/${id}`)
  }

  // FLOORS
  async getAllFloors(buildingId?: string): Promise<Floor[]> {
    const params = buildingId ? `?buildingId=${buildingId}` : ''
    const response = await api.get(`/floors${params}`)
    return response.data.data
  }

  async getFloorById(id: string): Promise<Floor> {
    const response = await api.get(`/floors/${id}`)
    return response.data
  }

  async createFloor(data: CreateFloorDto): Promise<Floor> {
    const response = await api.post('/floors', data)
    return response.data
  }

  async updateFloor(id: string, data: UpdateFloorDto): Promise<Floor> {
    const response = await api.patch(`/floors/${id}`, data)
    return response.data
  }

  async deleteFloor(id: string): Promise<void> {
    await api.delete(`/floors/${id}`)
  }

  // ROOMS
  async getAllRooms(floorId?: string): Promise<Room[]> {
    const params = floorId ? `?floorId=${floorId}` : ''
    const response = await api.get(`/rooms${params}`)
    return response.data.data
  }

  async getRoomById(id: string): Promise<Room> {
    const response = await api.get(`/rooms/${id}`)
    return response.data
  }

  async createRoom(data: CreateRoomDto): Promise<Room> {
    const response = await api.post('/rooms', data)
    return response.data
  }

  async updateRoom(id: string, data: UpdateRoomDto): Promise<Room> {
    const response = await api.patch(`/rooms/${id}`, data)
    return response.data
  }

  async deleteRoom(id: string): Promise<void> {
    await api.delete(`/rooms/${id}`)
  }

  // BEDS
  async getAllBeds(roomId?: string): Promise<Bed[]> {
    const params = roomId ? `?roomId=${roomId}` : ''
    const response = await api.get(`/beds${params}`)
    return response.data.data
  }

  async findAll(params?: { skip?: number; take?: number; roomId?: string; status?: string }): Promise<{ data: Bed[]; total: number; skip: number; take: number }> {
    const queryParams = new URLSearchParams()
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString())
    if (params?.take !== undefined) queryParams.append('take', params.take.toString())
    if (params?.roomId) queryParams.append('roomId', params.roomId)
    if (params?.status) queryParams.append('status', params.status)

    const query = queryParams.toString()
    const response = await api.get(`/beds${query ? `?${query}` : ''}`)
    return response.data
  }

  async getBedById(id: string): Promise<Bed> {
    const response = await api.get(`/beds/${id}`)
    return response.data
  }

  async createBed(data: CreateBedDto): Promise<Bed> {
    const response = await api.post('/beds', data)
    return response.data
  }

  async updateBed(id: string, data: UpdateBedDto): Promise<Bed> {
    const response = await api.patch(`/beds/${id}`, data)
    return response.data
  }

  async deleteBed(id: string): Promise<void> {
    await api.delete(`/beds/${id}`)
  }

  async assignResident(bedId: string, data: AssignBedDto): Promise<Bed> {
    const response = await api.post(`/beds/${bedId}/assign`, data)
    return response.data
  }

  async unassignResident(bedId: string): Promise<Bed> {
    const response = await api.post(`/beds/${bedId}/unassign`)
    return response.data
  }

  // HIERARCHY MAP
  async getBedsHierarchy(): Promise<BedsHierarchy> {
    const response = await api.get('/beds/map/full')
    return response.data
  }

  // BUILDING STRUCTURE GENERATOR
  async createBuildingStructure(data: any): Promise<{
    building: Building
    floors: Floor[]
    rooms: Room[]
    beds: Bed[]
  }> {
    const response = await api.post('/buildings/structure', data)
    return response.data
  }

  // BED OPERATIONS
  async reserveBed(bedId: string, data: ReserveBedDto): Promise<{ bed: Bed; message: string }> {
    const response = await api.post(`/beds/${bedId}/reserve`, data)
    return response.data
  }

  async blockBed(bedId: string, data: BlockBedDto): Promise<{ bed: Bed; message: string }> {
    const response = await api.post(`/beds/${bedId}/block`, data)
    return response.data
  }

  async releaseBed(bedId: string, data: ReleaseBedDto): Promise<{ bed: Bed; message: string }> {
    const response = await api.post(`/beds/${bedId}/release`, data)
    return response.data
  }

  async getBedStatusHistory(params?: { bedId?: string; skip?: number; take?: number }): Promise<{
    data: BedStatusHistoryEntry[]
    total: number
    skip: number
    take: number
  }> {
    const queryParams = new URLSearchParams()
    if (params?.bedId) queryParams.append('bedId', params.bedId)
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString())
    if (params?.take !== undefined) queryParams.append('take', params.take.toString())

    const query = queryParams.toString()
    const response = await api.get(`/beds/status-history${query ? `?${query}` : ''}`)
    return response.data
  }
}

export const bedsAPI = new BedsAPI()
