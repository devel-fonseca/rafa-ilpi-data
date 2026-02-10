import { Info } from 'lucide-react';
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
  const selectedDescription = value
    ? POSITION_CODE_DESCRIPTIONS[value as PositionCode]
    : null;

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
        <SelectContent className="max-h-[280px]">
          {Object.entries(PositionCode).map(([, code]) => (
            <SelectItem
              key={code}
              value={code}
              className="py-3"
              textValue={POSITION_CODE_LABELS[code]}
            >
              <div>
                <div className="font-medium">{POSITION_CODE_LABELS[code]}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {POSITION_CODE_DESCRIPTIONS[code]}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedDescription ? (
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {selectedDescription}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          O cargo determina permissões técnicas e clínicas.
        </p>
      )}
    </div>
  );
}
