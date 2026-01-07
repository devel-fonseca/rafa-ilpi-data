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
      bgColor: 'bg-primary/10 dark:bg-primary/20',
      iconColor: 'text-primary dark:text-primary/40',
      valueColor: 'text-primary/80 dark:text-primary/30',
      tabValue: 'buildings',
    },
    {
      title: 'Andares',
      value: floorsCount,
      icon: Home,
      bgColor: 'bg-success/10 dark:bg-success/20',
      iconColor: 'text-success dark:text-success/40',
      valueColor: 'text-success/80 dark:text-success/30',
      tabValue: 'floors',
    },
    {
      title: 'Quartos',
      value: roomsCount,
      icon: Square,
      bgColor: 'bg-severity-warning/10 dark:bg-severity-warning/20',
      iconColor: 'text-severity-warning dark:text-severity-warning/40',
      valueColor: 'text-severity-warning/80 dark:text-severity-warning/30',
      tabValue: 'rooms',
    },
    {
      title: 'Leitos',
      value: bedsCount,
      icon: Bed,
      bgColor: 'bg-medication-controlled/10 dark:bg-medication-controlled/20',
      iconColor: 'text-medication-controlled dark:text-medication-controlled/40',
      valueColor: 'text-medication-controlled/80 dark:text-medication-controlled/30',
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
