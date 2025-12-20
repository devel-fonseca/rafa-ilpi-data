import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GripVertical, Plus } from 'lucide-react';
import { RECORD_TYPE_LABELS } from '@/utils/recordTypeLabels';
import { RecordType, ScheduleFrequency } from '@/hooks/useResidentSchedule';
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice';

// Re-exportar RecordType para uso em outros componentes
export type { RecordType };

interface DraggableRecordTypeCardProps {
  recordType: RecordType;
  onQuickAdd?: (recordType: RecordType, frequency: ScheduleFrequency) => void;
}

export function DraggableRecordTypeCard({
  recordType,
  onQuickAdd,
}: DraggableRecordTypeCardProps) {
  const isTouchDevice = useIsTouchDevice();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `draggable-${recordType}`,
    data: { recordType },
  });

  const typeInfo = RECORD_TYPE_LABELS[recordType];

  if (!typeInfo) return null;

  // Para dispositivos touch, mostrar botões de ação rápida
  if (isTouchDevice && onQuickAdd) {
    return (
      <Card className="transition-all hover:shadow-md">
        <CardContent className="p-2">
          <div className="space-y-1.5">
            <Badge
              variant="secondary"
              className={`${typeInfo.color} ${typeInfo.bgColor} border-2 w-full justify-center text-xs py-1`}
            >
              {typeInfo.label}
            </Badge>
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                variant="outline"
                className="w-full h-6 text-[10px] px-2"
                onClick={() => onQuickAdd(recordType, 'DAILY')}
                title="Adicionar como registro diário"
              >
                <Plus className="h-3 w-3 mr-1" />
                Diário
              </Button>
              {recordType !== 'ALIMENTACAO' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-6 text-[10px] px-2"
                    onClick={() => onQuickAdd(recordType, 'WEEKLY')}
                    title="Adicionar como registro semanal"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Semanal
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-6 text-[10px] px-2"
                    onClick={() => onQuickAdd(recordType, 'MONTHLY')}
                    title="Adicionar como registro mensal"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Mensal
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Para desktop, manter drag-and-drop
  return (
    <Card
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md hover:scale-105'
      }`}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Badge
            variant="secondary"
            className={`${typeInfo.color} ${typeInfo.bgColor} border-2 flex-1 justify-center`}
          >
            {typeInfo.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
