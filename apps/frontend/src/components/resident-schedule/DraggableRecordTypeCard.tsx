import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GripVertical } from 'lucide-react';
import { RECORD_TYPE_LABELS } from '@/utils/recordTypeLabels';
import { RecordType } from '@/hooks/useResidentSchedule';

// Re-exportar RecordType para uso em outros componentes
export type { RecordType };

interface DraggableRecordTypeCardProps {
  recordType: RecordType;
}

export function DraggableRecordTypeCard({
  recordType,
}: DraggableRecordTypeCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `draggable-${recordType}`,
    data: { recordType },
  });

  const typeInfo = RECORD_TYPE_LABELS[recordType];

  if (!typeInfo) return null;

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
