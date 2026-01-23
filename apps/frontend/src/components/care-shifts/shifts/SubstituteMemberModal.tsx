// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - SubstituteMemberModal (Modal para Substituir Membro)
// ──────────────────────────────────────────────────────────────────────────────

import { Loader2, UserX, UserPlus } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { POSITION_CODE_LABELS, PositionCode } from '@/types/permissions';
import { api } from '@/services/api';
import { tenantKey } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth.store';
import { useSubstituteMember } from '@/hooks/care-shifts/useShifts';
import type { Shift } from '@/types/care-shifts/care-shifts';

interface UserForSelection {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  profile: {
    positionCode: string;
  } | null;
}

const ALLOWED_POSITION_CODES = [
  'CAREGIVER',
  'NURSE',
  'NURSING_TECHNICIAN',
  'NURSING_ASSISTANT',
];

const substituteMemberSchema = z.object({
  originalUserId: z.string().min(1, 'Selecione o membro a ser substituído'),
  newUserId: z.string().min(1, 'Selecione o novo membro'),
  reason: z.string().min(3, 'Informe o motivo da substituição'),
});

type SubstituteMemberFormData = z.infer<typeof substituteMemberSchema>;

interface SubstituteMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: Shift | undefined;
}

/**
 * Modal para substituir membro individual de um plantão
 */
export function SubstituteMemberModal({
  open,
  onOpenChange,
  shift,
}: SubstituteMemberModalProps) {
  const substituteMutation = useSubstituteMember();
  const { user } = useAuthStore();
  const tenantId = user?.tenant?.id;

  // Buscar usuários ativos com cargos adequados
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<UserForSelection[]>({
    queryKey: tenantKey('care-shifts', 'available-members'),
    queryFn: async () => {
      if (!tenantId) return [];
      const response = await api.get<UserForSelection[]>(
        `/tenants/${tenantId}/users`,
        {
          params: {
            isActive: true,
            positionCodes: ALLOWED_POSITION_CODES.join(','),
          },
        },
      );
      return response.data;
    },
    enabled: !!tenantId && open,
  });

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<SubstituteMemberFormData>({
    resolver: zodResolver(substituteMemberSchema),
    defaultValues: {
      originalUserId: '',
      newUserId: '',
      reason: '',
    },
  });

  const activeMembers = shift?.members?.filter((m) => !m.removedAt) || [];
  const isLoading = substituteMutation.isPending;
  const selectedOriginalUserId = watch('originalUserId');

  // Filtrar usuários disponíveis (não podem estar já designados)
  const assignedUserIds = new Set(activeMembers.map((m) => m.userId));
  const availableUsers = users.filter(
    (u) => !assignedUserIds.has(u.id) || u.id === selectedOriginalUserId
  );

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const onSubmit = async (data: SubstituteMemberFormData) => {
    if (!shift) return;

    try {
      await substituteMutation.mutateAsync({
        shiftId: shift.id,
        data: {
          originalUserId: data.originalUserId,
          newUserId: data.newUserId,
          reason: data.reason,
        },
      });
      onOpenChange(false);
      reset();
    } catch (error) {
      // Erro tratado pelo hook
    }
  };

  if (!shift) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        onOpenChange(newOpen);
        if (!newOpen) reset();
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Substituir Membro</DialogTitle>
          <DialogDescription>
            Substitua um membro da equipe que faltou ou não poderá trabalhar no plantão
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Turno Info */}
          <div className="bg-muted p-3 rounded-lg space-y-1">
            <p className="text-sm font-medium">
              {shift.shiftTemplate?.name} -{' '}
              {new Date(shift.date.split('T')[0] + 'T12:00:00').toLocaleDateString(
                'pt-BR'
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {shift.shiftTemplate?.startTime} - {shift.shiftTemplate?.endTime}
            </p>
          </div>

          {/* Membro Original */}
          <div className="space-y-2">
            <Label htmlFor="originalUserId">
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4" />
                Membro a ser substituído
              </div>
            </Label>
            <Controller
              name="originalUserId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="originalUserId">
                    <SelectValue placeholder="Selecione o membro" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeMembers.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Nenhum membro designado
                      </div>
                    ) : (
                      activeMembers.map((member) => (
                        <SelectItem key={member.id} value={member.userId}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getInitials(member.user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span>{member.user.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {member.user.profile?.positionCode
                                  ? POSITION_CODE_LABELS[
                                      member.user.profile.positionCode as PositionCode
                                    ]
                                  : 'Profissional'}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.originalUserId && (
              <p className="text-sm text-destructive">
                {errors.originalUserId.message}
              </p>
            )}
          </div>

          {/* Novo Membro */}
          <div className="space-y-2">
            <Label htmlFor="newUserId">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Novo membro
              </div>
            </Label>
            <Controller
              name="newUserId"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isLoadingUsers}
                >
                  <SelectTrigger id="newUserId">
                    <SelectValue placeholder="Selecione o novo membro" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingUsers ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Carregando usuários...
                      </div>
                    ) : availableUsers.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Nenhum usuário disponível
                      </div>
                    ) : (
                      availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span>{user.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {user.profile?.positionCode
                                  ? POSITION_CODE_LABELS[
                                      user.profile.positionCode as PositionCode
                                    ]
                                  : 'Profissional'}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.newUserId && (
              <p className="text-sm text-destructive">{errors.newUserId.message}</p>
            )}
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da substituição</Label>
            <Controller
              name="reason"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="reason"
                  placeholder="Ex: Funcionário de férias, atestado médico, etc."
                  rows={3}
                  {...field}
                />
              )}
            />
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Substituição
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
