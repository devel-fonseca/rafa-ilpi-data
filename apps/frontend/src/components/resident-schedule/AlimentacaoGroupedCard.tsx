import { useState } from 'react';
import { Edit2, Trash2, ChevronDown, ChevronUp, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResidentScheduleConfig } from '@/hooks/useResidentSchedule';
import { MEAL_TYPES } from '@/constants/meal-types';

interface AlimentacaoGroupedCardProps {
  configs: ResidentScheduleConfig[];
  canManage: boolean;
  onEdit: (configs: ResidentScheduleConfig[]) => void;
  onDelete: () => void;
}

export function AlimentacaoGroupedCard({
  configs,
  canManage,
  onEdit,
  onDelete,
}: AlimentacaoGroupedCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Ordenar configs por horário (primeiro horário de cada refeição)
  const sortedConfigs = [...configs].sort((a, b) => {
    const timeA = a.suggestedTimes[0] || '99:99';
    const timeB = b.suggestedTimes[0] || '99:99';
    return timeA.localeCompare(timeB);
  });

  return (
    <Card className="p-3 sm:p-4 bg-card hover:bg-accent/50 transition-colors border-2 border-severity-warning/30">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Utensils className="h-5 w-5 text-severity-warning" />
            <span className="font-semibold text-base">Alimentação</span>
            <Badge variant="secondary" className="text-xs">
              6 refeições
            </Badge>
          </div>

          {/* Lista de horários (sempre visível) */}
          <div className="text-sm text-muted-foreground mb-2 space-y-1">
            {sortedConfigs.map((config) => {
              const metadata = config.metadata as { mealType?: string };
              const mealType = MEAL_TYPES.find((m) => m.value === metadata?.mealType);
              return (
                <div key={config.id} className="grid grid-cols-[20px_1fr_auto] items-center gap-2">
                  <span className="text-base">{mealType?.icon || '🍽️'}</span>
                  <span className="font-medium truncate">{mealType?.label || metadata?.mealType}:</span>
                  <span className="font-medium">{config.suggestedTimes[0]}</span>
                </div>
              );
            })}
          </div>

          {/* Botão de expandir/colapsar */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 px-2 text-xs"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Ocultar detalhes
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Ver detalhes
              </>
            )}
          </Button>

          {/* Detalhes expandidos */}
          {isExpanded && configs[0]?.notes && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Obs:</span> {configs[0].notes}
              </p>
            </div>
          )}
        </div>

        {canManage && (
          <div className="flex items-start gap-1 ml-1 sm:ml-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(configs)}
              title="Editar horários de alimentação"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onDelete}
              title="Remover todas as configurações de alimentação"
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
