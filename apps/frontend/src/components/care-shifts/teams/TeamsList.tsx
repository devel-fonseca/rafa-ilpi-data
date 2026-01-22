// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - TeamsList (Lista de Equipes)
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Plus, Edit2, Trash2, Users, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeams, useDeleteTeam } from '@/hooks/care-shifts/useTeams';
import { usePermissions, PermissionType } from '@/hooks/usePermissions';
import type { Team } from '@/types/care-shifts/teams';
import { TeamFormModal } from './TeamFormModal';

interface TeamsListProps {
  onSelectTeam?: (team: Team) => void;
}

export function TeamsList({ onSelectTeam }: TeamsListProps) {
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | undefined>(undefined);
  const [deletingTeam, setDeletingTeam] = useState<Team | undefined>(undefined);

  // Permissões
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(PermissionType.MANAGE_TEAMS);
  const canUpdate = hasPermission(PermissionType.MANAGE_TEAMS);
  const canDelete = hasPermission(PermissionType.MANAGE_TEAMS);

  // Query
  const { data, isLoading } = useTeams({
    page,
    limit: 20,
    isActive: isActiveFilter,
    search: search || undefined,
  });

  const deleteMutation = useDeleteTeam();

  const teams = data?.data || [];
  const totalPages = data?.totalPages || 1;

  const handleCreate = () => {
    setSelectedTeam(undefined);
    setFormOpen(true);
  };

  const handleEdit = (team: Team) => {
    setSelectedTeam(team);
    setFormOpen(true);
  };

  const handleDelete = (team: Team) => {
    setDeletingTeam(team);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTeam) return;

    try {
      await deleteMutation.mutateAsync(deletingTeam.id);
      setDeletingTeam(undefined);
    } catch (error) {
      // Erro tratado pelo hook
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setSelectedTeam(undefined);
  };

  const activeMembers = (team: Team) =>
    team.members.filter((m) => !m.removedAt).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Equipes de Cuidadores</CardTitle>
              <CardDescription>Gerencie as equipes dos plantões</CardDescription>
            </div>
            {canCreate && (
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Equipe
              </Button>
            )}
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar equipe..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={
                isActiveFilter === undefined
                  ? 'all'
                  : isActiveFilter
                    ? 'true'
                    : 'false'
              }
              onValueChange={(value) => {
                setIsActiveFilter(
                  value === 'all' ? undefined : value === 'true',
                );
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="true">Ativas</SelectItem>
                <SelectItem value="false">Inativas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {teams.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                {search || isActiveFilter !== undefined
                  ? 'Nenhuma equipe encontrada com os filtros aplicados'
                  : 'Nenhuma equipe cadastrada. Crie a primeira equipe!'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => onSelectTeam?.(team)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Indicador de cor */}
                    <div
                      className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                      style={{ backgroundColor: team.color || '#3B82F6' }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{team.name}</h3>
                        {!team.isActive && (
                          <Badge variant="secondary">Inativa</Badge>
                        )}
                      </div>
                      {team.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {team.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>
                          {activeMembers(team)}{' '}
                          {activeMembers(team) === 1 ? 'membro' : 'membros'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2">
                    {canUpdate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(team);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(team);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      <TeamFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        team={selectedTeam}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Dialog */}
      <AlertDialog
        open={!!deletingTeam}
        onOpenChange={(open) => !open && setDeletingTeam(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a equipe <strong>{deletingTeam?.name}</strong>?
              {deletingTeam && activeMembers(deletingTeam) > 0 && (
                <span className="block mt-2 text-warning">
                  ⚠️ Esta equipe possui {activeMembers(deletingTeam)} membro(s) ativo(s).
                </span>
              )}
              <span className="block mt-2">
                Equipes com plantões futuros não podem ser excluídas.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
