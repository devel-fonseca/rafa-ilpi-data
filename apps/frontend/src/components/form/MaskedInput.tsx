import { forwardRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  mask: string
  value?: string
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  validation?: { valido: boolean; mensagem: string }
}

// Função para aplicar máscara
const applyMask = (value: string, mask: string): string => {
  if (!value) return ''

  const cleanValue = value.replace(/\D/g, '')
  let maskedValue = ''
  let valueIndex = 0

  for (let i = 0; i < mask.length && valueIndex < cleanValue.length; i++) {
    if (mask[i] === '9') {
      maskedValue += cleanValue[valueIndex]
      valueIndex++
    } else {
      maskedValue += mask[i]
    }
  }

  return maskedValue
}

export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, value = '', onChange, validation, className, ...props }, ref) => {
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value
      const maskedValue = applyMask(rawValue, mask)

      // Criar novo evento com valor mascarado
      const newEvent = {
        ...e,
        target: {
          ...e.target,
          value: maskedValue
        }
      } as React.ChangeEvent<HTMLInputElement>

      onChange?.(newEvent)
    }, [mask, onChange])

    return (
      <div className="w-full">
        <Input
          {...props}
          ref={ref}
          value={applyMask(value, mask)}
          onChange={handleChange}
          className={cn(
            className,
            validation && !validation.valido && value && 'border-danger focus-visible:ring-red-500'
          )}
        />
        {validation && validation.mensagem && value && (
          <p className={cn(
            'text-xs mt-1',
            validation.valido ? 'text-success' : 'text-danger'
          )}>
            {validation.mensagem}
          </p>
        )}
      </div>
    )
  }
)

MaskedInput.displayName = 'MaskedInput'
