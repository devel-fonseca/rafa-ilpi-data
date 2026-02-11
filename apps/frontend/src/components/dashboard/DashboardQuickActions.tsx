import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { QuickActionsGrid } from '@/design-system/components';
import {
  type DashboardQuickActionContext,
  getDashboardQuickActions,
} from '@/config/dashboardQuickActions';

interface DashboardQuickActionsProps {
  context: DashboardQuickActionContext;
  positionCode?: string | null;
  mode?: 'toolbar' | 'grid';
  gridColumns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

/**
 * Componente universal de ações rápidas por dashboard/contexto/cargo.
 * Permite exibição em modo toolbar (ícones) ou grid (cards).
 */
export function DashboardQuickActions({
  context,
  positionCode,
  mode = 'grid',
  gridColumns = 4,
  className,
}: DashboardQuickActionsProps) {
  const navigate = useNavigate();

  const actions = useMemo(
    () => getDashboardQuickActions(context, positionCode),
    [context, positionCode],
  );

  if (actions.length === 0) {
    return null;
  }

  if (mode === 'toolbar') {
    return (
      <TooltipProvider delayDuration={200}>
        <div className={cn('flex items-center gap-2 overflow-x-auto', className)}>
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Tooltip key={action.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-md"
                    onClick={() => navigate(action.to)}
                    disabled={action.disabled}
                    aria-label={action.title}
                  >
                    <Icon className="h-5 w-5 text-primary" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center">
                  <p className="font-medium">{action.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {action.disabled ? 'Em breve' : action.description}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className={className}>
      <QuickActionsGrid
        columns={gridColumns}
        actions={actions.map((action) => ({
          title: action.title,
          description: action.description,
          icon: action.icon,
          disabled: action.disabled,
          onClick: () => navigate(action.to),
        }))}
      />
    </div>
  );
}
