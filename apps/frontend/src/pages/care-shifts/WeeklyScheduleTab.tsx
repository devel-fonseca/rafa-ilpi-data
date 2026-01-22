// ──────────────────────────────────────────────────────────────────────────────
//  PAGE - WeeklyScheduleTab (Aba do Padrão Semanal Recorrente)
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Calendar, Loader2, AlertCircle, RefreshCw, Trash2, Power, PowerOff, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { SeverityAlert } from '@/design-system/components';
import { WeeklyScheduleGrid } from '@/components/care-shifts/weekly-schedule/WeeklyScheduleGrid';
import {
  useActiveWeeklyPattern,
  useAllWeeklyPatterns,
  useCreateWeeklyPattern,
  useUpdateWeeklyPattern,
  useDeleteWeeklyPattern,
} from '@/hooks/care-shifts/useWeeklySchedule';
import { useShiftTemplates } from '@/hooks/care-shifts/useShiftTemplates';
import { usePermissions, PermissionType } from '@/hooks/usePermissions';
import { format } from 'date-fns';
import { formatDateOnlySafe } from '@/utils/dateHelpers';

export function WeeklyScheduleTab() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedNumberOfWeeks, setSelectedNumberOfWeeks] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [patternToDelete, setPatternToDelete] = useState<string | null>(null);
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PermissionType.UPDATE_CARE_SHIFTS);

  // Buscar padrão ativo
  const {
    data: pattern,
    isLoading: patternLoading,
    error: patternError,
  } = useActiveWeeklyPattern();

  // Buscar todos os padrões
  const {
    data: allPatterns,
    isLoading: allPatternsLoading,
  } = useAllWeeklyPatterns();

  // Buscar turnos fixos
  const {
    data: shiftTemplates,
    isLoading: templatesLoading,
  } = useShiftTemplates();

  const createPatternMutation = useCreateWeeklyPattern();
  const updatePatternMutation = useUpdateWeeklyPattern();
  const deletePatternMutation = useDeleteWeeklyPattern();

  // Handler para abrir dialog de criação
  const handleOpenCreateDialog = () => {
    setSelectedNumberOfWeeks(1);
    setCreateDialogOpen(true);
  };

  // Handler para confirmar criação do padrão
  const handleConfirmCreatePattern = async () => {
    const today = new Date();
    const patternNames = {
      1: 'Padrão Semanal',
      2: 'Padrão Quinzenal',
      3: 'Padrão Tri-semanal',
      4: 'Padrão Mensal',
    };

    await createPatternMutation.mutateAsync({
      name: patternNames[selectedNumberOfWeeks as keyof typeof patternNames] || 'Padrão Semanal',
      description: `Padrão recorrente de ${selectedNumberOfWeeks} semana(s)`,
      startDate: format(today, 'yyyy-MM-dd'),
      numberOfWeeks: selectedNumberOfWeeks,
    });

    setCreateDialogOpen(false);
  };

  // Handler para ativar padrão
  const handleActivatePattern = async (patternId: string) => {
    await updatePatternMutation.mutateAsync({
      id: patternId,
      data: { isActive: true },
    });
  };

  // Handler para desativar padrão
  const handleDeactivatePattern = async (patternId: string) => {
    await updatePatternMutation.mutateAsync({
      id: patternId,
      data: { isActive: false },
    });
  };

  // Handler para abrir dialog de confirmação de deleção
  const handleOpenDeleteDialog = (patternId: string) => {
    setPatternToDelete(patternId);
    setDeleteDialogOpen(true);
  };

  // Handler para confirmar deleção
  const handleConfirmDelete = async () => {
    if (!patternToDelete) return;

    await deletePatternMutation.mutateAsync(patternToDelete);
    setDeleteDialogOpen(false);
    setPatternToDelete(null);
  };

  // Loading state
  if (patternLoading || templatesLoading || allPatternsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state (404 significa que não há padrão ativo)
  if (patternError) {
    const isNotFound =
      'response' in patternError &&
      typeof patternError.response === 'object' &&
      patternError.response !== null &&
      'status' in patternError.response &&
      patternError.response.status === 404;

    if (isNotFound) {
      // Verificar se há padrões inativos disponíveis
      const hasInactivePatterns = allPatterns && allPatterns.length > 0;

      return (
        <>
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-6">
                {hasInactivePatterns
                  ? 'Nenhum padrão ativo no momento. Ative um padrão existente ou crie um novo.'
                  : 'Nenhum padrão semanal encontrado. Crie um padrão para organizar os turnos recorrentes.'}
              </p>
              {canManage && (
                <Button
                  onClick={handleOpenCreateDialog}
                  disabled={createPatternMutation.isPending}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {hasInactivePatterns ? 'Criar Novo Padrão' : 'Criar Padrão Inicial'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Lista de Padrões Inativos (se houver) */}
          {canManage && hasInactivePatterns && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Padrões Disponíveis</CardTitle>
                <CardDescription>
                  Ative um padrão existente para começar a usar ou crie um novo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allPatterns.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{p.name}</h4>
                            <Badge variant="secondary">Inativo</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {p.numberOfWeeks === 1 ? (
                              'Padrão Semanal'
                            ) : p.numberOfWeeks === 2 ? (
                              'Padrão Quinzenal (2 semanas)'
                            ) : p.numberOfWeeks === 3 ? (
                              'Padrão Tri-semanal (3 semanas)'
                            ) : (
                              'Padrão Mensal (4 semanas)'
                            )}{' '}
                            • Início:{' '}
                            {formatDateOnlySafe(p.startDate)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleActivatePattern(p.id)}
                          disabled={updatePatternMutation.isPending}
                        >
                          <Power className="mr-2 h-4 w-4" />
                          Ativar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDeleteDialog(p.id)}
                          disabled={deletePatternMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dialog de Criação de Padrão */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Padrão Semanal</DialogTitle>
                <DialogDescription>
                  Escolha quantas semanas o padrão deve ter antes de se repetir. Use
                  padrões de múltiplas semanas para turnos rotativos (ex: 12x36).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="numberOfWeeks">Duração do Ciclo</Label>
                  <Select
                    value={selectedNumberOfWeeks.toString()}
                    onValueChange={(v) => setSelectedNumberOfWeeks(Number(v))}
                  >
                    <SelectTrigger id="numberOfWeeks">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">1 semana (Semanal)</span>
                          <span className="text-xs text-muted-foreground">
                            Padrão se repete toda semana
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="2">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">2 semanas (Quinzenal)</span>
                          <span className="text-xs text-muted-foreground">
                            Ideal para turnos 12x36
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="3">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">3 semanas (Tri-semanal)</span>
                          <span className="text-xs text-muted-foreground">
                            Rotação a cada 3 semanas
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="4">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">4 semanas (Mensal)</span>
                          <span className="text-xs text-muted-foreground">
                            Rotação mensal completa
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmCreatePattern}
                  disabled={createPatternMutation.isPending}
                >
                  {createPatternMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Padrão'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      );
    }

    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive/50 mb-4" />
          <p className="text-destructive">
            Erro ao carregar padrão semanal. Tente novamente.
          </p>
        </CardContent>
      </Card>
    );
  }

  // No shift templates available
  if (!shiftTemplates || shiftTemplates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-severity-warning/50 mb-4" />
          <p className="text-muted-foreground">
            Nenhum turno disponível. Configure os turnos na aba "Configurar Turnos".
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Padrão Semanal Recorrente
              </CardTitle>
              <CardDescription>
                Configure as equipes que se repetem semanalmente. Os plantões serão
                gerados automaticamente com base neste padrão.
              </CardDescription>
            </div>
            {canManage && (
              <Button onClick={handleOpenCreateDialog} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Novo Padrão
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Gerenciamento de Padrões */}
      {canManage && allPatterns && allPatterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Padrões Disponíveis</CardTitle>
            <CardDescription>
              Gerencie seus padrões semanais. Ative, desative ou remova padrões conforme necessário.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allPatterns.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{p.name}</h4>
                        {p.isActive ? (
                          <Badge variant="default" className="bg-success">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {p.numberOfWeeks === 1 ? (
                          'Padrão Semanal'
                        ) : p.numberOfWeeks === 2 ? (
                          'Padrão Quinzenal (2 semanas)'
                        ) : p.numberOfWeeks === 3 ? (
                          'Padrão Tri-semanal (3 semanas)'
                        ) : (
                          'Padrão Mensal (4 semanas)'
                        )}{' '}
                        • Início:{' '}
                        {formatDateOnlySafe(p.startDate)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.isActive ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivatePattern(p.id)}
                        disabled={updatePatternMutation.isPending}
                      >
                        <PowerOff className="mr-2 h-4 w-4" />
                        Desativar
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleActivatePattern(p.id)}
                          disabled={updatePatternMutation.isPending}
                        >
                          <Power className="mr-2 h-4 w-4" />
                          Ativar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDeleteDialog(p.id)}
                          disabled={deletePatternMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerta de Instruções */}
      {canManage && (
        <SeverityAlert
          severity="info"
          title="Como usar o Padrão Semanal"
          message={
            pattern && pattern.numberOfWeeks > 1
              ? `Clique em qualquer célula para designar uma equipe. Este padrão de ${pattern.numberOfWeeks} semanas se repetirá automaticamente em ciclos. Os plantões são gerados diariamente às 02:00 AM.`
              : 'Clique em qualquer célula para designar uma equipe a um dia+turno. Este padrão se repetirá automaticamente todas as semanas. Os plantões são gerados diariamente às 02:00 AM.'
          }
        />
      )}

      {/* Grid Semanal (inclui legenda na parte inferior) */}
      {pattern && (
        <WeeklyScheduleGrid
          pattern={pattern}
          shiftTemplates={shiftTemplates}
          canManage={canManage}
        />
      )}

      {/* Dialog de Confirmação de Deleção */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este padrão? Esta ação não pode ser
              desfeita. Apenas padrões inativos podem ser excluídos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deletePatternMutation.isPending}
            >
              {deletePatternMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir Padrão'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Criação de Padrão */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Padrão Semanal</DialogTitle>
            <DialogDescription>
              Escolha quantas semanas o padrão deve ter antes de se repetir. Use
              padrões de múltiplas semanas para turnos rotativos (ex: 12x36).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="numberOfWeeks">Duração do Ciclo</Label>
              <Select
                value={selectedNumberOfWeeks.toString()}
                onValueChange={(v) => setSelectedNumberOfWeeks(Number(v))}
              >
                <SelectTrigger id="numberOfWeeks">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">1 semana (Semanal)</span>
                      <span className="text-xs text-muted-foreground">
                        Padrão se repete toda semana
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="2">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">2 semanas (Quinzenal)</span>
                      <span className="text-xs text-muted-foreground">
                        Ideal para turnos 12x36
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="3">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">3 semanas (Tri-semanal)</span>
                      <span className="text-xs text-muted-foreground">
                        Rotação a cada 3 semanas
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="4">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">4 semanas (Mensal)</span>
                      <span className="text-xs text-muted-foreground">
                        Rotação mensal completa
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmCreatePattern}
              disabled={createPatternMutation.isPending}
            >
              {createPatternMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Padrão'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
