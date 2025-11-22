import { useState } from 'react'
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

// Hooks
import { useBuildings, useDeleteBuilding } from '@/hooks/useBuildings'
import { useFloors, useDeleteFloor } from '@/hooks/useFloors'
import { useRooms, useDeleteRoom } from '@/hooks/useRooms'
import { useBeds, useDeleteBed } from '@/hooks/useBeds'

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

import { Building, Floor, Room, Bed } from '@/api/beds.api'

export function BedsStructurePage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('buildings')

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
  const [deleteItem, setDeleteItem] = useState<any>(null)

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Estrutura de Leitos</h1>
          <p className="text-muted-foreground">
            Gerencie prédios, andares, quartos e leitos
          </p>
        </div>
        {activeTab === 'buildings' && (
          <div className="flex gap-2">
            <Button
              onClick={() => setGeneratorOpen(true)}
              className="bg-amber-600 hover:bg-amber-700"
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
        )}
        {activeTab === 'floors' && (
          <Button
            onClick={() => {
              setSelectedFloor(undefined)
              setFloorFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Andar
          </Button>
        )}
        {activeTab === 'rooms' && (
          <Button
            onClick={() => {
              setSelectedRoom(undefined)
              setRoomFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Quarto
          </Button>
        )}
        {activeTab === 'beds' && (
          <Button
            onClick={() => {
              setSelectedBed(undefined)
              setBedFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Leito
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <BedsStatsCards
        buildingsCount={buildings?.length || 0}
        floorsCount={floors?.length || 0}
        roomsCount={rooms?.length || 0}
        bedsCount={beds?.length || 0}
        onTabChange={setActiveTab}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="hidden">
          <TabsTrigger value="buildings">Prédios</TabsTrigger>
          <TabsTrigger value="floors">Andares</TabsTrigger>
          <TabsTrigger value="rooms">Quartos</TabsTrigger>
          <TabsTrigger value="beds">Leitos</TabsTrigger>
        </TabsList>

        {/* TAB: PRÉDIOS */}
        <TabsContent value="buildings" className="space-y-4">
          {loadingBuildings ? (
            <div className="text-center py-8">Carregando...</div>
          ) : buildings && buildings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {buildings.map((building) => (
                <BuildingCard
                  key={building.id}
                  building={building}
                  onEdit={handleEditBuilding}
                  onDelete={handleDeleteBuilding}
                  onNavigateFloors={handleNavigateFloors}
                  onNavigateRooms={handleNavigateRooms}
                  onNavigateBeds={handleNavigateBeds}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum prédio cadastrado
            </div>
          )}
        </TabsContent>

        {/* TAB: ANDARES */}
        <TabsContent value="floors" className="space-y-4">
          {loadingFloors ? (
            <div className="text-center py-8">Carregando...</div>
          ) : floors && floors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {floors.map((floor) => (
                <FloorCard
                  key={floor.id}
                  floor={floor}
                  onEdit={handleEditFloor}
                  onDelete={handleDeleteFloor}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum andar cadastrado
            </div>
          )}
        </TabsContent>

        {/* TAB: QUARTOS */}
        <TabsContent value="rooms" className="space-y-4">
          {loadingRooms ? (
            <div className="text-center py-8">Carregando...</div>
          ) : rooms && rooms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onEdit={handleEditRoom}
                  onDelete={handleDeleteRoom}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum quarto cadastrado
            </div>
          )}
        </TabsContent>

        {/* TAB: LEITOS */}
        <TabsContent value="beds" className="space-y-4">
          {loadingBeds ? (
            <div className="text-center py-8">Carregando...</div>
          ) : beds && beds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {beds.map((bed) => (
                <BedCard
                  key={bed.id}
                  bed={bed}
                  onEdit={handleEditBed}
                  onDelete={handleDeleteBed}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum leito cadastrado
            </div>
          )}
        </TabsContent>
      </Tabs>

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
    </div>
  )
}
