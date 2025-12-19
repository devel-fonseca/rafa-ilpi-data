import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: number
  title: string
  description?: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  className?: string
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn('w-full', className)}>
      <nav aria-label="Progress">
        <ol className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep
            const isCurrent = index === currentStep
            const isUpcoming = index > currentStep

            return (
              <li
                key={step.id}
                className={cn(
                  'relative flex-1',
                  index !== steps.length - 1 && 'pr-8 sm:pr-20'
                )}
              >
                {/* Connector Line */}
                {index !== steps.length - 1 && (
                  <div
                    className="absolute top-4 left-0 -ml-px mt-0.5 h-0.5 w-full"
                    aria-hidden="true"
                  >
                    <div
                      className={cn(
                        'h-full w-full',
                        isCompleted ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  </div>
                )}

                <div className="group relative flex flex-col items-start">
                  <span className="flex h-9 items-center">
                    <span
                      className={cn(
                        'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                        isCompleted &&
                          'border-primary bg-primary text-primary-foreground',
                        isCurrent &&
                          'border-primary bg-background text-primary',
                        isUpcoming && 'border-muted-foreground/30 bg-background text-muted-foreground'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-semibold">
                          {step.id}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="mt-2 flex min-w-0 flex-col">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isCurrent && 'text-primary',
                        (isCompleted || isUpcoming) && 'text-muted-foreground'
                      )}
                    >
                      {step.title}
                    </span>
                    {step.description && (
                      <span className="text-xs text-muted-foreground">
                        {step.description}
                      </span>
                    )}
                  </span>
                </div>
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}
