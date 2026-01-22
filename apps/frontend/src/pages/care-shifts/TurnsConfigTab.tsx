// ──────────────────────────────────────────────────────────────────────────────
//  PAGE - TurnsConfigTab (Aba de Configuração de Turnos)
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Settings, Loader2, Clock, AlertCircle, Edit2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { SeverityAlert } from '@/design-system/components';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useShiftTemplates,
  useUpdateShiftTemplateConfig,
} from '@/hooks/care-shifts/useShiftTemplates';
import { usePermissions, PermissionType } from '@/hooks/usePermissions';
import type { ShiftTemplate } from '@/types/care-shifts/shift-templates';

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export function TurnsConfigTab() {
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(
    null,
  );
  const [customName, setCustomName] = useState('');
  const [customStartTime, setCustomStartTime] = useState('');
  const [customEndTime, setCustomEndTime] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PermissionType.CONFIGURE_SHIFT_SETTINGS);

  const { data: shiftTemplates, isLoading } = useShiftTemplates();
  const updateConfigMutation = useUpdateShiftTemplateConfig();

  // Handler para toggle de ativação/desativação
  const handleToggleEnabled = async (
    templateId: string,
    currentEnabled: boolean,
  ) => {
    await updateConfigMutation.mutateAsync({
      templateId,
      data: { isEnabled: !currentEnabled },
    });
  };

  // Handler para abrir modal de edição
  const handleOpenEditDialog = (template: ShiftTemplate) => {
    setEditingTemplate(template);
    setCustomName(template.tenantConfig?.customName || '');
    setCustomStartTime(template.tenantConfig?.customStartTime || '');
    setCustomEndTime(template.tenantConfig?.customEndTime || '');
    setDialogOpen(true);
  };

  // Handler para salvar customizações
  const handleSaveCustomizations = async () => {
    if (!editingTemplate) return;

    await updateConfigMutation.mutateAsync({
      templateId: editingTemplate.id,
      data: {
        customName: customName.trim() || null,
        customStartTime: customStartTime.trim() || null,
        customEndTime: customEndTime.trim() || null,
      },
    });

    setDialogOpen(false);
    setEditingTemplate(null);
    setCustomName('');
    setCustomStartTime('');
    setCustomEndTime('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!shiftTemplates || shiftTemplates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-severity-warning/50 mb-4" />
          <p className="text-muted-foreground">
            Nenhum turno disponível no sistema.
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
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração de Turnos
          </CardTitle>
          <CardDescription>
            Ative ou desative turnos e personalize seus nomes conforme necessário
            para sua instituição.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Alerta de Instruções */}
      {canManage && (
        <SeverityAlert
          severity="info"
          title="Configuração de Turnos"
          message="Turnos desativados não aparecerão no padrão semanal nem nos plantões. Você pode personalizar o nome para adequar à nomenclatura da sua instituição."
        />
      )}

      {/* Lista de Turnos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shiftTemplates.map((template) => {
          const isEnabled = template.tenantConfig?.isEnabled !== false;
          const displayName =
            template.tenantConfig?.customName || template.name;

          return (
            <Card
              key={template.id}
              className={!isEnabled ? 'opacity-60' : undefined}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    {/* Nome e Badge */}
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{displayName}</h3>
                      {template.tenantConfig?.customName && (
                        <Badge variant="outline" className="text-xs">
                          Customizado
                        </Badge>
                      )}
                      {!isEnabled && (
                        <Badge variant="secondary" className="text-xs">
                          Desativado
                        </Badge>
                      )}
                    </div>

                    {/* Horário */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {template.startTime} - {template.endTime}
                      </span>
                      <span>({template.duration}h)</span>
                    </div>

                    {/* Nome Original (se customizado) */}
                    {template.tenantConfig?.customName && (
                      <div className="text-xs text-muted-foreground">
                        Nome original: {template.name}
                      </div>
                    )}

                    {/* Ações */}
                    {canManage && (
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditDialog(template)}
                        >
                          <Edit2 className="mr-2 h-3 w-3" />
                          Personalizar
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Switch de Ativação */}
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() =>
                          handleToggleEnabled(template.id, isEnabled)
                        }
                        disabled={updateConfigMutation.isPending}
                      />
                      <Label className="text-xs text-muted-foreground">
                        {isEnabled ? 'Ativo' : 'Inativo'}
                      </Label>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog de Personalização */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Personalizar Turno</DialogTitle>
            <DialogDescription>
              Customize o nome e horários do turno para adequar à realidade da sua
              instituição. Deixe em branco para usar os valores padrão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {editingTemplate && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="customName">Nome Customizado (Opcional)</Label>
                  <Input
                    id="customName"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder={editingTemplate.name}
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    Padrão: {editingTemplate.name}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customStartTime">Horário Início (Opcional)</Label>
                    <Input
                      id="customStartTime"
                      type="time"
                      value={customStartTime}
                      onChange={(e) => setCustomStartTime(e.target.value)}
                      placeholder={editingTemplate.startTime}
                    />
                    <p className="text-xs text-muted-foreground">
                      Padrão: {editingTemplate.startTime}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customEndTime">Horário Fim (Opcional)</Label>
                    <Input
                      id="customEndTime"
                      type="time"
                      value={customEndTime}
                      onChange={(e) => setCustomEndTime(e.target.value)}
                      placeholder={editingTemplate.endTime}
                    />
                    <p className="text-xs text-muted-foreground">
                      Padrão: {editingTemplate.endTime}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-muted p-3 text-sm">
                  <p className="font-medium mb-1">Valores Atuais:</p>
                  <div className="text-muted-foreground space-y-1">
                    <div>
                      <strong>Nome:</strong>{' '}
                      {editingTemplate.tenantConfig?.customName || editingTemplate.name}
                    </div>
                    <div>
                      <strong>Horário:</strong>{' '}
                      {editingTemplate.tenantConfig?.customStartTime || editingTemplate.startTime} -{' '}
                      {editingTemplate.tenantConfig?.customEndTime || editingTemplate.endTime}
                    </div>
                    <div>
                      <strong>Duração:</strong>{' '}
                      {editingTemplate.tenantConfig?.customDuration || editingTemplate.duration}h
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveCustomizations}
              disabled={updateConfigMutation.isPending}
            >
              Salvar Personalização
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
