// ──────────────────────────────────────────────────────────────────────────────
//  PAGE - TeamsViewTab (Aba de Gestão de Equipes)
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { TeamsList } from '@/components/care-shifts/teams/TeamsList';
import { TeamMemberSelector } from '@/components/care-shifts/teams/TeamMemberSelector';
import { useTeam, useAddTeamMember, useRemoveTeamMember } from '@/hooks/care-shifts/useTeams';
import { usePermissions, PermissionType } from '@/hooks/usePermissions';
import type { Team, TeamMember } from '@/types/care-shifts/teams';
import { POSITION_CODE_LABELS, PositionCode } from '@/types/permissions';

export function TeamsViewTab() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(undefined);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [memberRole, setMemberRole] = useState('Membro');
  const [removingMember, setRemovingMember] = useState<TeamMember | undefined>(undefined);

  // Permissões
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PermissionType.MANAGE_TEAMS);

  // Query da equipe selecionada
  const { data: selectedTeam } = useTeam(selectedTeamId);

  // Mutations
  const addMemberMutation = useAddTeamMember();
  const removeMemberMutation = useRemoveTeamMember();

  const activeMembers = selectedTeam?.members.filter((m) => !m.removedAt) || [];
  const activeMemberIds = activeMembers.map((m) => m.userId);

  const handleTeamSelect = (team: Team) => {
    setSelectedTeamId(team.id);
    setSelectedUserId(undefined);
    setMemberRole('Membro');
  };

  const handleAddMember = async () => {
    if (!selectedTeamId || !selectedUserId) return;

    try {
      await addMemberMutation.mutateAsync({
        teamId: selectedTeamId,
        data: {
          userId: selectedUserId,
          role: memberRole,
        },
      });
      setSelectedUserId(undefined);
      setMemberRole('Membro');
    } catch (error) {
      // Erro tratado pelo hook
    }
  };

  const handleRemoveMember = (member: TeamMember) => {
    setRemovingMember(member);
  };

  const handleConfirmRemove = async () => {
    if (!removingMember || !selectedTeamId) return;

    try {
      await removeMemberMutation.mutateAsync({
        teamId: selectedTeamId,
        userId: removingMember.userId,
      });
      setRemovingMember(undefined);
    } catch (error) {
      // Erro tratado pelo hook
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Coluna esquerda: Lista de equipes */}
      <div>
        <TeamsList onSelectTeam={handleTeamSelect} />
      </div>

      {/* Coluna direita: Detalhes da equipe */}
      <div className="space-y-6">
        {!selectedTeam ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                Selecione uma equipe para ver os detalhes e gerenciar membros
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Card de detalhes */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full border border-border flex-shrink-0"
                    style={{ backgroundColor: selectedTeam.color || '#3B82F6' }}
                  />
                  <div className="flex-1">
                    <CardTitle>{selectedTeam.name}</CardTitle>
                    {selectedTeam.description && (
                      <CardDescription>{selectedTeam.description}</CardDescription>
                    )}
                  </div>
                  {!selectedTeam.isActive && (
                    <Badge variant="secondary">Inativa</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <p>
                    <strong>Membros ativos:</strong> {activeMembers.length}
                  </p>
                  <p>
                    <strong>Total de membros:</strong> {selectedTeam.members.length}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Card de adicionar membro */}
            {canManage && selectedTeam.isActive && (
              <Card>
                <CardHeader>
                  <CardTitle>Adicionar Membro</CardTitle>
                  <CardDescription>
                    Adicione cuidadores ou profissionais de enfermagem à equipe
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="member-selector">Selecionar Profissional</Label>
                    <TeamMemberSelector
                      value={selectedUserId}
                      onValueChange={setSelectedUserId}
                      excludeUserIds={activeMemberIds}
                      placeholder="Buscar por nome, email ou registro..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Função na Equipe</Label>
                    <Select
                      value={memberRole}
                      onValueChange={setMemberRole}
                    >
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Selecione a função" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Membro">Membro</SelectItem>
                        <SelectItem value="Líder">Líder</SelectItem>
                        <SelectItem value="Suplente">Suplente</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Líder e Suplente podem fazer check-in e passagem de plantão
                    </p>
                  </div>

                  <Button
                    onClick={handleAddMember}
                    disabled={!selectedUserId || addMemberMutation.isPending}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar à Equipe
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Card de membros */}
            <Card>
              <CardHeader>
                <CardTitle>Membros ({activeMembers.length})</CardTitle>
                <CardDescription>
                  {activeMembers.length === 0
                    ? 'Nenhum membro ativo nesta equipe'
                    : 'Profissionais designados a esta equipe'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-sm text-muted-foreground">
                      Adicione o primeiro membro à equipe
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{member.user.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {member.user.email}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {member.role && (
                              <Badge variant="outline" className="text-xs">
                                {member.role}
                              </Badge>
                            )}
                            {member.user.profile && (
                              <Badge variant="secondary" className="text-xs">
                                {POSITION_CODE_LABELS[
                                  member.user.profile.positionCode as PositionCode
                                ] || member.user.profile.positionCode}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(member)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Dialog de confirmação de remoção */}
      <AlertDialog
        open={!!removingMember}
        onOpenChange={(open) => !open && setRemovingMember(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{removingMember?.user.name}</strong> da equipe?
              <span className="block mt-2">
                O histórico será mantido, mas o membro não aparecerá mais nos plantões futuros.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
