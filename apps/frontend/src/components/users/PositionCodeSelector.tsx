import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PositionCode,
  POSITION_CODE_LABELS,
  POSITION_CODE_DESCRIPTIONS,
} from '@/types/permissions';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PositionCodeSelectorProps {
  value?: PositionCode | string;
  onValueChange: (value: PositionCode) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export function PositionCodeSelector({
  value,
  onValueChange,
  label = 'Cargo',
  required = false,
  disabled = false,
}: PositionCodeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="positionCode">
        {label} {required && '*'}
      </Label>
      <Select
        value={value}
        onValueChange={(val) => onValueChange(val as PositionCode)}
        disabled={disabled}
      >
        <SelectTrigger id="positionCode">
          <SelectValue placeholder="Selecione um cargo..." />
        </SelectTrigger>
        <SelectContent className="max-h-[400px]">
          {Object.entries(PositionCode).map(([, code]) => (
            <SelectItem key={code} value={code} className="py-3">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="font-medium">{POSITION_CODE_LABELS[code]}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {POSITION_CODE_DESCRIPTIONS[code]}
                  </div>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p>{POSITION_CODE_DESCRIPTIONS[code]}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
