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
      bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      valueColor: 'text-blue-700 dark:text-blue-300',
      tabValue: 'buildings',
    },
    {
      title: 'Andares',
      value: floorsCount,
      icon: Home,
      bgColor: 'bg-green-500/10 dark:bg-green-500/20',
      iconColor: 'text-green-600 dark:text-green-400',
      valueColor: 'text-green-700 dark:text-green-300',
      tabValue: 'floors',
    },
    {
      title: 'Quartos',
      value: roomsCount,
      icon: Square,
      bgColor: 'bg-orange-500/10 dark:bg-orange-500/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      valueColor: 'text-orange-700 dark:text-orange-300',
      tabValue: 'rooms',
    },
    {
      title: 'Leitos',
      value: bedsCount,
      icon: Bed,
      bgColor: 'bg-purple-500/10 dark:bg-purple-500/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      valueColor: 'text-purple-700 dark:text-purple-300',
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
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </h3>
                <p className={`text-2xl font-bold ${card.valueColor} mt-1`}>
                  {card.value}
                </p>
              </div>
              <div
                className={`flex items-center justify-center w-12 h-12 ${card.bgColor} rounded-lg`}
              >
                <card.icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
