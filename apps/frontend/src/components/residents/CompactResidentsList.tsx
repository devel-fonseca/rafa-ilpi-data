import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PhotoViewer } from '@/components/form/PhotoViewer'
import { Eye, ChevronRight, Accessibility } from 'lucide-react'
import { formatBedFromResident } from '@/utils/formatters'
import type { Resident } from '@/api/residents.api'

interface CompactResidentsListProps {
  residents: Resident[]
  title?: string
  limit?: number
}

export function CompactResidentsList({ residents, title = 'Residentes Recentes', limit = 10 }: CompactResidentsListProps) {
  const navigate = useNavigate()

  // 📅 RESIDENTES RECENTES
  // IMPORTANTE: Ordenamos por createdAt (data de cadastro no sistema), não por admissionDate.
  // Isso mostra os residentes cadastrados mais recentemente, independente de quando foram admitidos na ILPI.
  // Para ver apenas admissões recentes (últimos 30 dias por admissionDate), use o alerta "Admissões recentes".
  const sortedResidents = [...residents]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ATIVO':
        return 'bg-success/10 text-success border-success/30'
      case 'INATIVO':
        return 'bg-warning/10 text-warning border-warning/30'
      case 'ALTA':
        return 'bg-info/10 text-info border-info/30'
      case 'OBITO':
        return 'bg-muted text-muted-foreground border-border'
      case 'TRANSFERIDO':
        return 'bg-accent/10 text-accent border-accent/30'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  if (sortedResidents.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">{title}</h3>
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum residente encontrado
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-semibold">{title}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/residentes')}
            className="text-primary hover:text-primary text-xs sm:text-sm"
          >
            Ver todos
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
          </Button>
        </div>

        <div className="space-y-2">
          {sortedResidents.map((resident) => (
            <div
              key={resident.id}
              className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border hover:bg-accent/5 transition-colors cursor-pointer"
              onClick={() => navigate(`/dashboard/residentes/${resident.id}/view`)}
            >
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <PhotoViewer
                  photoUrl={resident.fotoUrl}
                  altText={resident.fullName}
                  size="sm"
                  rounded={true}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs sm:text-sm truncate">{resident.fullName}</p>
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                    {resident.bedId ? (
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatBedFromResident(resident as Record<string, unknown>)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Sem leito</span>
                    )}
                    {resident.mobilityAid && (
                      <>
                        <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
                        <Badge
                          variant="default"
                          className="bg-primary/10 text-primary border-primary/30 text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0"
                        >
                          <Accessibility className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                          Auxílio
                        </Badge>
                      </>
                    )}
                    <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
                    <Badge className={`${getStatusBadgeColor(resident.status)} text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 whitespace-nowrap`}>
                      {resident.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 h-7 w-7 sm:h-8 sm:w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/dashboard/residentes/${resident.id}`)
                }}
              >
                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
