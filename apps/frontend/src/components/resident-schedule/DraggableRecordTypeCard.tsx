import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { GripVertical, Plus } from 'lucide-react';
import { RECORD_TYPE_LABELS } from '@/utils/recordTypeLabels';
import { RecordType, ScheduleFrequency } from '@/hooks/useResidentSchedule';
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice';

// Re-exportar RecordType para uso em outros componentes
export type { RecordType };

// Descrições dos tipos de registro para tooltips
const RECORD_TYPE_DESCRIPTIONS: Record<string, string> = {
  HIGIENE: 'Indica as condições de higiene e os cuidados realizados, refletindo o nível de autonomia do residente e suas necessidades de apoio.',
  ALIMENTACAO: 'Refere-se à aceitação alimentar e ao modo como o residente se alimenta, permitindo acompanhar padrões e possíveis alterações.',
  HIDRATACAO: 'Indica a ingestão de líquidos ao longo do período, contribuindo para o monitoramento do equilíbrio hídrico e prevenção de intercorrências.',
  MONITORAMENTO: 'Reúne parâmetros observados durante o cuidado, auxiliando na identificação precoce de alterações do estado de saúde.',
  ELIMINACAO: 'Refere-se ao padrão urinário e intestinal do residente, permitindo reconhecer mudanças relevantes no funcionamento fisiológico.',
  COMPORTAMENTO: 'Refere-se à forma como o residente se apresenta no momento da avaliação, podendo variar conforme o contexto e as condições do dia.',
  HUMOR: 'Indica o estado emocional predominante do residente, geralmente mais estável que o comportamento momentâneo.',
  SONO: 'Indica a qualidade e o padrão do sono, favorecendo a identificação de alterações que possam impactar o bem-estar e a saúde.',
  PESO: 'Permite acompanhar medidas corporais relevantes para a avaliação nutricional e o monitoramento das condições gerais de saúde.',
  ATIVIDADES: 'Registra a participação em atividades recreativas, terapêuticas ou sociais, contribuindo para o acompanhamento do engajamento e bem-estar.',
};

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
      <Card className="transition-all hover:shadow-sm">
        <CardContent className="p-2">
          <div className="space-y-1.5">
            <Badge
              variant="secondary"
              className={`${typeInfo.color} ${typeInfo.bgColor} border-2 w-full justify-center text-xs py-1 whitespace-normal text-center leading-tight`}
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

  // Para desktop, manter drag-and-drop com tooltip
  const description = RECORD_TYPE_DESCRIPTIONS[recordType];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          className={`cursor-grab active:cursor-grabbing transition-all min-w-0 ${
            isDragging ? 'opacity-50' : 'hover:shadow-sm'
          }`}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Badge
                variant="secondary"
                className={`${typeInfo.color} ${typeInfo.bgColor} border-2 flex-1 justify-center whitespace-normal text-center leading-tight`}
              >
                {typeInfo.label}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </TooltipTrigger>
      {description && (
        <TooltipContent side="bottom" className="max-w-xs">
          <p>{description}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
