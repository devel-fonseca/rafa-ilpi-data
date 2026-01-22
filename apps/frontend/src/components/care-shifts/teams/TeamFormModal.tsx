// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - TeamFormModal (Criar/Editar Equipe)
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateTeam, useUpdateTeam } from '@/hooks/care-shifts/useTeams';
import type { Team } from '@/types/care-shifts/teams';

const teamSchema = z.object({
  name: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6})$/, 'Cor deve estar no formato hex (#FF5733)')
    .optional(),
  isActive: z.boolean().optional(), // Apenas para edição, não enviado na criação
});

type TeamFormData = z.infer<typeof teamSchema>;

interface TeamFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team?: Team;
  onSuccess?: () => void;
}

const PREDEFINED_COLORS = [
  { name: 'Vermelho', value: '#EF4444' },
  { name: 'Laranja', value: '#F97316' },
  { name: 'Amarelo', value: '#EAB308' },
  { name: 'Verde', value: '#22C55E' },
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Roxo', value: '#A855F7' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Cinza', value: '#6B7280' },
];

export function TeamFormModal({
  open,
  onOpenChange,
  team,
  onSuccess,
}: TeamFormModalProps) {
  const isEditing = !!team;

  const createMutation = useCreateTeam();
  const updateMutation = useUpdateTeam();

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: team?.name || '',
      description: team?.description || '',
      color: team?.color || '#3B82F6',
      isActive: team?.isActive ?? true,
    },
  });

  const selectedColor = watch('color');

  useEffect(() => {
    if (open && team) {
      reset({
        name: team.name,
        description: team.description || '',
        color: team.color || '#3B82F6',
        isActive: team.isActive,
      });
    } else if (open && !team) {
      reset({
        name: '',
        description: '',
        color: '#3B82F6',
        isActive: true,
      });
    }
  }, [open, team, reset]);

  const onSubmit = async (data: TeamFormData) => {
    try {
      if (isEditing && team) {
        await updateMutation.mutateAsync({
          id: team.id,
          data: {
            name: data.name,
            description: data.description || undefined,
            color: data.color || undefined,
            isActive: data.isActive,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          description: data.description || undefined,
          color: data.color || undefined,
          // isActive não é enviado na criação - backend usa default true
        });
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // Erro tratado pelo hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Equipe' : 'Nova Equipe'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações da equipe de cuidadores.'
              : 'Crie uma nova equipe de cuidadores para os plantões.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nome da Equipe <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Ex: Equipe A Manhã"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Descrição opcional da equipe..."
              rows={3}
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Cor */}
          <div className="space-y-2">
            <Label htmlFor="color">Cor</Label>
            <div className="flex gap-4 items-center">
              <Controller
                name="color"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione uma cor" />
                    </SelectTrigger>
                    <SelectContent>
                      {PREDEFINED_COLORS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full border border-border"
                              style={{ backgroundColor: color.value }}
                            />
                            <span>{color.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {/* Preview da cor */}
              <div
                className="w-10 h-10 rounded-md border border-border flex-shrink-0"
                style={{ backgroundColor: selectedColor || '#3B82F6' }}
              />
            </div>
            {errors.color && (
              <p className="text-sm text-destructive">{errors.color.message}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="isActive">Status</Label>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? 'true' : 'false'}
                  onValueChange={(value) => field.onChange(value === 'true')}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ativa</SelectItem>
                    <SelectItem value="false">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-2 pt-4">
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
              {isEditing ? 'Salvar Alterações' : 'Criar Equipe'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
