import { Info, AlertTriangle, CheckCircle2, Lock } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { PositionCode } from '@/types/permissions'
import {
  getRoleRecommendation,
  ROLE_LABELS,
  type UserRole,
} from '@/utils/roleRecommendation'

interface RoleSelectorWithSuggestionProps {
  value: UserRole
  onValueChange: (value: UserRole) => void
  positionCode: PositionCode | null
  isTechnicalManager: boolean
  isNursingCoordinator: boolean
  disabled?: boolean
}

export function RoleSelectorWithSuggestion({
  value,
  onValueChange,
  positionCode,
  isTechnicalManager,
  isNursingCoordinator,
  disabled = false,
}: RoleSelectorWithSuggestionProps) {
  const recommendation = getRoleRecommendation(
    positionCode,
    isTechnicalManager,
    isNursingCoordinator
  )

  const isDifferentFromSuggestion = value !== recommendation.suggestedRole
  const isLocked = !recommendation.allowOverride

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label htmlFor="role">
          Role do Sistema*
          {isLocked && <Lock className="inline ml-1 h-3 w-3" />}
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                Define a hierarquia administrativa do usuário no sistema:
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• <strong>Admin:</strong> Acesso total</li>
                <li>• <strong>Gerente:</strong> Gestão de equipe</li>
                <li>• <strong>Colaborador:</strong> Operacional</li>
                <li>• <strong>Visualizador:</strong> Somente leitura</li>
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled || isLocked}
      >
        <SelectTrigger
          id="role"
          className={
            isDifferentFromSuggestion && !isLocked
              ? 'border-amber-500'
              : undefined
          }
        >
          <SelectValue placeholder="Selecione a role" />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
            <SelectItem key={role} value={role}>
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {ROLE_LABELS[role].title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {ROLE_LABELS[role].description}
                  </span>
                </div>
                {role === recommendation.suggestedRole && (
                  <CheckCircle2 className="h-4 w-4 text-success ml-2" />
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sugestão automática */}
      {recommendation && (
        <Alert
          variant={
            isDifferentFromSuggestion && !isLocked ? 'default' : 'default'
          }
          className={
            isLocked
              ? 'bg-primary/5 dark:bg-primary/95 border-primary/30 dark:border-primary/80'
              : isDifferentFromSuggestion
                ? 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800'
                : 'bg-success/5 dark:bg-success/95 border-success/30 dark:border-success/80'
          }
        >
          <div className="flex gap-2">
            {isLocked ? (
              <Lock className="h-4 w-4 text-primary dark:text-primary/40 mt-0.5" />
            ) : isDifferentFromSuggestion ? (
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-success dark:text-success/40 mt-0.5" />
            )}
            <div className="flex-1">
              <AlertDescription className="text-sm">
                {isLocked ? (
                  <p>
                    <strong className="text-primary/80 dark:text-primary/30">
                      Role bloqueada:
                    </strong>{' '}
                    {recommendation.reason}
                  </p>
                ) : isDifferentFromSuggestion ? (
                  <>
                    <p>
                      <strong className="text-amber-700 dark:text-amber-300">
                        Atenção:
                      </strong>{' '}
                      Role sugerida é{' '}
                      <strong>{ROLE_LABELS[recommendation.suggestedRole].title}</strong>
                    </p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      {recommendation.reason}
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      <strong className="text-success/80 dark:text-success/30">
                        ✓ Recomendação seguida:
                      </strong>{' '}
                      {recommendation.reason}
                    </p>
                  </>
                )}

                {recommendation.warning && (
                  <p className="text-xs mt-2 text-amber-700 dark:text-amber-400 font-medium">
                    ⚠️ {recommendation.warning}
                  </p>
                )}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}
    </div>
  )
}
