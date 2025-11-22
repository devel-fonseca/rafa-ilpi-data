import { Building, Home, Square, Bed } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface BedsStatsCardsProps {
  buildingsCount: number
  floorsCount: number
  roomsCount: number
  bedsCount: number
  onTabChange: (tab: string) => void
}

export function BedsStatsCards({
  buildingsCount,
  floorsCount,
  roomsCount,
  bedsCount,
  onTabChange,
}: BedsStatsCardsProps) {
  const cards = [
    {
      title: 'Prédios',
      value: buildingsCount,
      icon: Building,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      valueColor: 'text-blue-600',
      tabValue: 'buildings',
    },
    {
      title: 'Andares',
      value: floorsCount,
      icon: Home,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
      valueColor: 'text-green-600',
      tabValue: 'floors',
    },
    {
      title: 'Quartos',
      value: roomsCount,
      icon: Square,
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-600',
      valueColor: 'text-orange-600',
      tabValue: 'rooms',
    },
    {
      title: 'Leitos',
      value: bedsCount,
      icon: Bed,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
      valueColor: 'text-purple-600',
      tabValue: 'beds',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => (
        <Card
          key={card.title}
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onTabChange(card.tabValue)}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div
                className={`flex items-center justify-center w-12 h-12 ${card.bgColor} rounded-lg`}
              >
                <card.icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600">
                  {card.title}
                </h3>
                <p className={`text-2xl font-bold ${card.valueColor}`}>
                  {card.value}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
