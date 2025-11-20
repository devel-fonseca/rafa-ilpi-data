import { BedsHierarchy } from '@/api/beds.api'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Building2, Layers, DoorOpen, Bed as BedIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface BedsMapVisualizationProps {
  data: BedsHierarchy
}

const BED_STATUS_COLORS: Record<string, string> = {
  DISPONIVEL: 'bg-green-100 text-green-800 border-green-300',
  OCUPADO: 'bg-red-100 text-red-800 border-red-300',
  MANUTENCAO: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  RESERVADO: 'bg-blue-100 text-blue-800 border-blue-300',
}

const BED_STATUS_LABELS: Record<string, string> = {
  DISPONIVEL: 'Disponível',
  OCUPADO: 'Ocupado',
  MANUTENCAO: 'Manutenção',
  RESERVADO: 'Reservado',
}

export function BedsMapVisualization({ data }: BedsMapVisualizationProps) {
  if (!data.buildings || data.buildings.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Nenhum prédio cadastrado ainda.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {data.buildings.map((building) => (
        <Card key={building.id} className="overflow-hidden">
          <Accordion type="multiple" className="w-full">
            <AccordionItem value={building.id} className="border-none">
              <AccordionTrigger className="px-6 hover:no-underline hover:bg-slate-50">
                <div className="flex items-center gap-3 flex-1">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <div className="flex-1 text-left">
                    <div className="font-semibold">{building.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {building.totalFloors} andares · {building.totalRooms} quartos ·{' '}
                      {building.totalBeds} leitos
                    </div>
                  </div>
                  <Badge variant="outline">{building.code}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="px-6 pb-4 space-y-3">
                  {building.floors && building.floors.length > 0 ? (
                    building.floors.map((floor) => (
                      <Card key={floor.id} className="bg-slate-50">
                        <Accordion type="multiple" className="w-full">
                          <AccordionItem value={floor.id} className="border-none">
                            <AccordionTrigger className="px-4 hover:no-underline">
                              <div className="flex items-center gap-3 flex-1">
                                <Layers className="h-4 w-4 text-purple-600" />
                                <div className="flex-1 text-left">
                                  <div className="font-medium text-sm">{floor.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {floor.totalRooms} quartos · {floor.totalBeds} leitos
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {floor.code}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="px-4 pb-3 space-y-2">
                                {floor.rooms && floor.rooms.length > 0 ? (
                                  floor.rooms.map((room) => (
                                    <Card key={room.id} className="bg-white">
                                      <Accordion type="multiple" className="w-full">
                                        <AccordionItem
                                          value={room.id}
                                          className="border-none"
                                        >
                                          <AccordionTrigger className="px-3 hover:no-underline">
                                            <div className="flex items-center gap-2 flex-1">
                                              <DoorOpen className="h-4 w-4 text-orange-600" />
                                              <div className="flex-1 text-left">
                                                <div className="font-medium text-sm">
                                                  {room.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                  {room.occupiedBeds}/{room.capacity} ocupados
                                                </div>
                                              </div>
                                              <Badge variant="secondary" className="text-xs">
                                                {room.roomNumber}
                                              </Badge>
                                            </div>
                                          </AccordionTrigger>
                                          <AccordionContent>
                                            <div className="px-3 pb-2">
                                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {room.beds && room.beds.length > 0 ? (
                                                  room.beds.map((bed) => (
                                                    <Card
                                                      key={bed.id}
                                                      className={`border-2 ${
                                                        BED_STATUS_COLORS[bed.status]
                                                      }`}
                                                    >
                                                      <CardContent className="p-3">
                                                        <div className="flex items-start gap-2">
                                                          <BedIcon className="h-4 w-4 mt-0.5" />
                                                          <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                              <span className="text-sm font-semibold">
                                                                Leito {bed.bedNumber}
                                                              </span>
                                                              <Badge
                                                                variant="outline"
                                                                className="text-xs"
                                                              >
                                                                {bed.code}
                                                              </Badge>
                                                            </div>
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                              {BED_STATUS_LABELS[bed.status]}
                                                            </div>
                                                            {bed.resident && (
                                                              <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                                                                <Avatar className="h-6 w-6">
                                                                  <AvatarImage
                                                                    src={bed.resident.fotoUrl}
                                                                  />
                                                                  <AvatarFallback className="text-xs">
                                                                    {bed.resident.fullName
                                                                      .split(' ')
                                                                      .map((n) => n[0])
                                                                      .join('')
                                                                      .slice(0, 2)
                                                                      .toUpperCase()}
                                                                  </AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-xs font-medium truncate">
                                                                  {bed.resident.fullName}
                                                                </span>
                                                              </div>
                                                            )}
                                                          </div>
                                                        </div>
                                                      </CardContent>
                                                    </Card>
                                                  ))
                                                ) : (
                                                  <div className="col-span-full text-center text-xs text-muted-foreground py-2">
                                                    Nenhum leito cadastrado
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </AccordionContent>
                                        </AccordionItem>
                                      </Accordion>
                                    </Card>
                                  ))
                                ) : (
                                  <div className="text-center text-xs text-muted-foreground py-2">
                                    Nenhum quarto cadastrado
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center text-xs text-muted-foreground py-2">
                      Nenhum andar cadastrado
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      ))}
    </div>
  )
}
