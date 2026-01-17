import { useState, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Zap } from 'lucide-react'
import { Page, PageHeader, Section } from '@/design-system/components'

// Hooks
import { useBuildings, useDeleteBuilding } from '@/hooks/useBuildings'
import { useFloors, useDeleteFloor } from '@/hooks/useFloors'
import { useRooms, useDeleteRoom } from '@/hooks/useRooms'
import { useBeds, useDeleteBed } from '@/hooks/useBeds'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'

// Components
import { BuildingCard } from '@/components/beds/BuildingCard'
import { FloorCard } from '@/components/beds/FloorCard'
import { RoomCard } from '@/components/beds/RoomCard'
import { BedCard } from '@/components/beds/BedCard'

import { BuildingForm } from '@/components/beds/BuildingForm'
import { FloorForm } from '@/components/beds/FloorForm'
import { RoomForm } from '@/components/beds/RoomForm'
import { BedForm } from '@/components/beds/BedForm'
import { BuildingStructureGenerator } from '@/components/beds/BuildingStructureGenerator'
import { BedsStatsCards } from '@/components/beds/BedsStatsCards'
import { BedsFilters } from '@/components/beds/BedsFilters'

import { Building, Floor, Room, Bed } from '@/api/beds.api'

export function BedsStructurePage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('buildings')
  const { hasPermission } = usePermissions()

  // Verificar permissão para gerenciar infraestrutura
  const canManageInfrastructure = hasPermission(PermissionType.MANAGE_INFRASTRUCTURE)

  // Estados para filtros
  const [searchText, setSearchText] = useState('')
  const [filterBuildingId, setFilterBuildingId] = useState('')
  const [filterFloorId, setFilterFloorId] = useState('')
  const [filterRoomId, setFilterRoomId] = useState('')

  // State para dialogs
  const [buildingFormOpen, setBuildingFormOpen] = useState(false)
  const [floorFormOpen, setFloorFormOpen] = useState(false)
  const [roomFormOpen, setRoomFormOpen] = useState(false)
  const [bedFormOpen, setBedFormOpen] = useState(false)
  const [generatorOpen, setGeneratorOpen] = useState(false)

  const [selectedBuilding, setSelectedBuilding] = useState<Building | undefined>()
  const [selectedFloor, setSelectedFloor] = useState<Floor | undefined>()
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>()
  const [selectedBed, setSelectedBed] = useState<Bed | undefined>()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteType, setDeleteType] = useState<'building' | 'floor' | 'room' | 'bed'>('building')
  const [deleteItem, setDeleteItem] = useState<Building | Floor | Room | Bed | null>(null)

  // Queries
  const { data: buildings, isLoading: loadingBuildings } = useBuildings()
  const { data: floors, isLoading: loadingFloors } = useFloors()
  const { data: rooms, isLoading: loadingRooms } = useRooms()
  const { data: beds, isLoading: loadingBeds } = useBeds()

  // Mutations
  const deleteBuildingMutation = useDeleteBuilding()
  const deleteFloorMutation = useDeleteFloor()
  const deleteRoomMutation = useDeleteRoom()
  const deleteBedMutation = useDeleteBed()

  // Função helper para filtrar por busca de texto
  const matchesSearch = (item: { name?: string; code?: string }, search: string) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      item.name?.toLowerCase().includes(searchLower) ||
      item.code?.toLowerCase().includes(searchLower)
    )
  }

  // Filtrar dados com base nos filtros ativos
  const filteredBuildings = useMemo(() => {
    if (!buildings) return []
    return buildings.filter(building => matchesSearch(building, searchText))
  }, [buildings, searchText])

  const filteredFloors = useMemo(() => {
    if (!floors) return []
    return floors.filter(floor => {
      if (!matchesSearch(floor, searchText)) return false
      if (filterBuildingId && floor.buildingId !== filterBuildingId) return false
      return true
    })
  }, [floors, searchText, filterBuildingId])

  const filteredRooms = useMemo(() => {
    if (!rooms) return []
    return rooms.filter(room => {
      if (!matchesSearch(room, searchText)) return false
      if (filterFloorId && room.floorId !== filterFloorId) return false
      if (filterBuildingId) {
        // Filtrar também por prédio através do andar
        const floor = floors?.find(f => f.id === room.floorId)
        if (floor && floor.buildingId !== filterBuildingId) return false
      }
      return true
    })
  }, [rooms, searchText, filterFloorId, filterBuildingId, floors])

  const filteredBeds = useMemo(() => {
    if (!beds) return []
    return beds.filter(bed => {
      if (!matchesSearch(bed, searchText)) return false
      if (filterRoomId && bed.roomId !== filterRoomId) return false
      if (filterFloorId) {
        // Filtrar também por andar através do quarto
        const room = rooms?.find(r => r.id === bed.roomId)
        if (room && room.floorId !== filterFloorId) return false
      }
      if (filterBuildingId) {
        // Filtrar também por prédio através do andar e quarto
        const room = rooms?.find(r => r.id === bed.roomId)
        if (room) {
          const floor = floors?.find(f => f.id === room.floorId)
          if (floor && floor.buildingId !== filterBuildingId) return false
        }
      }
      return true
    })
  }, [beds, searchText, filterRoomId, filterFloorId, filterBuildingId, rooms, floors])

  // Limpar filtros ao mudar de aba
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setSearchText('')
    setFilterBuildingId('')
    setFilterFloorId('')
    setFilterRoomId('')
  }

  // Handlers
  const handleEditBuilding = (building: Building) => {
    setSelectedBuilding(building)
    setBuildingFormOpen(true)
  }

  const handleDeleteBuilding = (building: Building) => {
    setDeleteType('building')
    setDeleteItem(building)
    setDeleteDialogOpen(true)
  }

  const handleEditFloor = (floor: Floor) => {
    setSelectedFloor(floor)
    setFloorFormOpen(true)
  }

  const handleDeleteFloor = (floor: Floor) => {
    setDeleteType('floor')
    setDeleteItem(floor)
    setDeleteDialogOpen(true)
  }

  const handleEditRoom = (room: Room) => {
    setSelectedRoom(room)
    setRoomFormOpen(true)
  }

  const handleDeleteRoom = (room: Room) => {
    setDeleteType('room')
    setDeleteItem(room)
    setDeleteDialogOpen(true)
  }

  const handleEditBed = (bed: Bed) => {
    setSelectedBed(bed)
    setBedFormOpen(true)
  }

  const handleDeleteBed = (bed: Bed) => {
    setDeleteType('bed')
    setDeleteItem(bed)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    try {
      if (deleteType === 'building') {
        await deleteBuildingMutation.mutateAsync(deleteItem.id)
        toast({ title: 'Prédio excluído com sucesso' })
      } else if (deleteType === 'floor') {
        await deleteFloorMutation.mutateAsync(deleteItem.id)
        toast({ title: 'Andar excluído com sucesso' })
      } else if (deleteType === 'room') {
        await deleteRoomMutation.mutateAsync(deleteItem.id)
        toast({ title: 'Quarto excluído com sucesso' })
      } else if (deleteType === 'bed') {
        await deleteBedMutation.mutateAsync(deleteItem.id)
        toast({ title: 'Leito excluído com sucesso' })
      }
      setDeleteDialogOpen(false)
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o item.',
        variant: 'destructive',
      })
    }
  }

  // Handlers de navegação dos cards
  const handleNavigateFloors = (building: Building) => {
    setSelectedBuilding(building)
    setActiveTab('floors')
  }

  const handleNavigateRooms = (building: Building) => {
    setSelectedBuilding(building)
    setActiveTab('rooms')
  }

  const handleNavigateBeds = (building: Building) => {
    setSelectedBuilding(building)
    setActiveTab('beds')
  }

  // Renderizar botões de ação baseados na aba ativa
  const renderActions = () => {
    if (!canManageInfrastructure) return null

    if (activeTab === 'buildings') {
      return (
        <div className="flex gap-2">
          <Button
            onClick={() => setGeneratorOpen(true)}
            variant="secondary"
            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30"
          >
            <Zap className="h-4 w-4 mr-2" />
            Gerador Automático de Estrutura
          </Button>
          <Button
            onClick={() => {
              setSelectedBuilding(undefined)
              setBuildingFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Prédio
          </Button>
        </div>
      )
    }

    if (activeTab === 'floors') {
      return (
        <Button
          onClick={() => {
            setSelectedFloor(undefined)
            setFloorFormOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Andar
        </Button>
      )
    }

    if (activeTab === 'rooms') {
      return (
        <Button
          onClick={() => {
            setSelectedRoom(undefined)
            setRoomFormOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Quarto
        </Button>
      )
    }

    if (activeTab === 'beds') {
      return (
        <Button
          onClick={() => {
            setSelectedBed(undefined)
            setBedFormOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Leito
        </Button>
      )
    }

    return null
  }

  return (
    <>
      <Page>
        <PageHeader
          title="Estrutura de Leitos"
          subtitle="Gerencie prédios, andares, quartos e leitos"
          actions={renderActions()}
        />

      <Section title="Estatísticas">
        <BedsStatsCards
          buildingsCount={buildings?.length || 0}
          floorsCount={floors?.length || 0}
          roomsCount={rooms?.length || 0}
          bedsCount={beds?.length || 0}
          onTabChange={setActiveTab}
        />
      </Section>

      <Section title="Estrutura">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="hidden">
            <TabsTrigger value="buildings">Prédios</TabsTrigger>
            <TabsTrigger value="floors">Andares</TabsTrigger>
            <TabsTrigger value="rooms">Quartos</TabsTrigger>
            <TabsTrigger value="beds">Leitos</TabsTrigger>
          </TabsList>

        {/* TAB: PRÉDIOS */}
        <TabsContent value="buildings" className="space-y-4">
          {/* Filtros */}
          <BedsFilters
            searchPlaceholder="Buscar prédio por nome ou código..."
            searchValue={searchText}
            onSearchChange={setSearchText}
          />

          {loadingBuildings ? (
            <div className="text-center py-8">Carregando...</div>
          ) : filteredBuildings && filteredBuildings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBuildings.map((building) => (
                <BuildingCard
                  key={building.id}
                  building={building}
                  onEdit={handleEditBuilding}
                  onDelete={handleDeleteBuilding}
                  onNavigateFloors={handleNavigateFloors}
                  onNavigateRooms={handleNavigateRooms}
                  onNavigateBeds={handleNavigateBeds}
                  canManage={canManageInfrastructure}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchText ? 'Nenhum prédio encontrado com os filtros aplicados' : 'Nenhum prédio cadastrado'}
            </div>
          )}
        </TabsContent>

        {/* TAB: ANDARES */}
        <TabsContent value="floors" className="space-y-4">
          {/* Filtros */}
          <BedsFilters
            searchPlaceholder="Buscar andar por nome ou código..."
            searchValue={searchText}
            onSearchChange={setSearchText}
            showBuildingFilter
            buildings={buildings}
            selectedBuildingId={filterBuildingId}
            onBuildingChange={setFilterBuildingId}
          />

          {loadingFloors ? (
            <div className="text-center py-8">Carregando...</div>
          ) : filteredFloors && filteredFloors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFloors.map((floor) => (
                <FloorCard
                  key={floor.id}
                  floor={floor}
                  onEdit={handleEditFloor}
                  onDelete={handleDeleteFloor}
                  canManage={canManageInfrastructure}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchText || filterBuildingId ? 'Nenhum andar encontrado com os filtros aplicados' : 'Nenhum andar cadastrado'}
            </div>
          )}
        </TabsContent>

        {/* TAB: QUARTOS */}
        <TabsContent value="rooms" className="space-y-4">
          {/* Filtros */}
          <BedsFilters
            searchPlaceholder="Buscar quarto por nome ou código..."
            searchValue={searchText}
            onSearchChange={setSearchText}
            showBuildingFilter
            buildings={buildings}
            selectedBuildingId={filterBuildingId}
            onBuildingChange={setFilterBuildingId}
            showFloorFilter
            floors={floors}
            selectedFloorId={filterFloorId}
            onFloorChange={setFilterFloorId}
          />

          {loadingRooms ? (
            <div className="text-center py-8">Carregando...</div>
          ) : filteredRooms && filteredRooms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onEdit={handleEditRoom}
                  onDelete={handleDeleteRoom}
                  canManage={canManageInfrastructure}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchText || filterBuildingId || filterFloorId ? 'Nenhum quarto encontrado com os filtros aplicados' : 'Nenhum quarto cadastrado'}
            </div>
          )}
        </TabsContent>

        {/* TAB: LEITOS */}
        <TabsContent value="beds" className="space-y-4">
          {/* Filtros */}
          <BedsFilters
            searchPlaceholder="Buscar leito por nome ou código..."
            searchValue={searchText}
            onSearchChange={setSearchText}
            showBuildingFilter
            buildings={buildings}
            selectedBuildingId={filterBuildingId}
            onBuildingChange={setFilterBuildingId}
            showFloorFilter
            floors={floors}
            selectedFloorId={filterFloorId}
            onFloorChange={setFilterFloorId}
            showRoomFilter
            rooms={rooms}
            selectedRoomId={filterRoomId}
            onRoomChange={setFilterRoomId}
          />

          {loadingBeds ? (
            <div className="text-center py-8">Carregando...</div>
          ) : filteredBeds && filteredBeds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBeds.map((bed) => (
                <BedCard
                  key={bed.id}
                  bed={bed}
                  onEdit={handleEditBed}
                  onDelete={handleDeleteBed}
                  canManage={canManageInfrastructure}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchText || filterBuildingId || filterFloorId || filterRoomId ? 'Nenhum leito encontrado com os filtros aplicados' : 'Nenhum leito cadastrado'}
            </div>
          )}
        </TabsContent>
        </Tabs>
      </Section>
    </Page>

    {/* FORMS */}
    <BuildingForm
        open={buildingFormOpen}
        onOpenChange={(open) => {
          setBuildingFormOpen(open)
          if (!open) setSelectedBuilding(undefined)
        }}
        building={selectedBuilding}
      />

      <FloorForm
        open={floorFormOpen}
        onOpenChange={(open) => {
          setFloorFormOpen(open)
          if (!open) setSelectedFloor(undefined)
        }}
        floor={selectedFloor}
      />

      <RoomForm
        open={roomFormOpen}
        onOpenChange={(open) => {
          setRoomFormOpen(open)
          if (!open) setSelectedRoom(undefined)
        }}
        room={selectedRoom}
      />

      <BedForm
        open={bedFormOpen}
        onOpenChange={(open) => {
          setBedFormOpen(open)
          if (!open) setSelectedBed(undefined)
        }}
        bed={selectedBed}
      />

      {/* DELETE DIALOG */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* BUILDING STRUCTURE GENERATOR */}
      <BuildingStructureGenerator open={generatorOpen} onOpenChange={setGeneratorOpen} />
    </>
  )
}
