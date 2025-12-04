import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface SOAPFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  guide?: string[]
  required?: boolean
  disabled?: boolean
}

export function SOAPField({
  label,
  value,
  onChange,
  placeholder,
  guide,
  required = false,
  disabled = false,
}: SOAPFieldProps) {
  const [guideOpen, setGuideOpen] = useState(false)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={label} className="text-sm font-semibold">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>

        {guide && guide.length > 0 && (
          <Collapsible open={guideOpen} onOpenChange={setGuideOpen}>
            <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              Guia orientativo
              <ChevronDown
                className={`h-3 w-3 transition-transform ${guideOpen ? 'rotate-180' : ''}`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground">
                <p className="font-medium mb-1">Tópicos sugeridos:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {guide.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      <Textarea
        id={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-[120px] resize-y"
      />

      {value && (
        <p className="text-xs text-muted-foreground">
          {value.length} caracteres
        </p>
      )}
    </div>
  )
}
