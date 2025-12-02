import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  PermissionType,
  PERMISSION_LABELS,
  PERMISSION_GROUPS,
} from '@/types/permissions';
import { Lock, Unlock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PermissionsManagerProps {
  inheritedPermissions: PermissionType[];
  customPermissions: PermissionType[];
  onCustomPermissionsChange: (permissions: PermissionType[]) => void;
  readonly?: boolean;
}

export function PermissionsManager({
  inheritedPermissions,
  customPermissions,
  onCustomPermissionsChange,
  readonly = false,
}: PermissionsManagerProps) {
  const [selectedCustom, setSelectedCustom] = useState<Set<PermissionType>>(
    new Set(customPermissions)
  );

  useEffect(() => {
    setSelectedCustom(new Set(customPermissions));
  }, [customPermissions]);

  const handleTogglePermission = (permission: PermissionType) => {
    if (readonly) return;

    const newSet = new Set(selectedCustom);
    if (newSet.has(permission)) {
      newSet.delete(permission);
    } else {
      newSet.add(permission);
    }
    setSelectedCustom(newSet);
    onCustomPermissionsChange(Array.from(newSet));
  };

  const isInherited = (permission: PermissionType) =>
    inheritedPermissions.includes(permission);

  const isCustom = (permission: PermissionType) => selectedCustom.has(permission);

  const isEnabled = (permission: PermissionType) =>
    isInherited(permission) || isCustom(permission);

  const getPermissionCount = (permissions: PermissionType[]) => {
    const inherited = permissions.filter((p) => isInherited(p)).length;
    const custom = permissions.filter((p) => isCustom(p) && !isInherited(p)).length;
    return { inherited, custom, total: inherited + custom };
  };

  return (
    <div className="space-y-4">
      {/* Header com legenda */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-blue-500" />
          <span className="text-muted-foreground">Herdada do cargo</span>
        </div>
        <div className="flex items-center gap-2">
          <Unlock className="h-4 w-4 text-green-500" />
          <span className="text-muted-foreground">Customizada</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-purple-500" />
          <span className="text-muted-foreground">Ambas</span>
        </div>
      </div>

      <Separator />

      {/* Grupos de permissões */}
      <Accordion type="multiple" defaultValue={Object.keys(PERMISSION_GROUPS)} className="w-full">
        {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => {
          const counts = getPermissionCount(group.permissions);

          return (
            <AccordionItem key={groupKey} value={groupKey}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <span className="font-medium">{group.label}</span>
                  <div className="flex items-center gap-2">
                    {counts.inherited > 0 && (
                      <Badge variant="outline" className="text-blue-600 border-blue-300">
                        {counts.inherited} herdada{counts.inherited > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {counts.custom > 0 && (
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        {counts.custom} custom
                      </Badge>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {group.permissions.map((permission) => {
                    const inherited = isInherited(permission);
                    const custom = isCustom(permission);
                    const enabled = isEnabled(permission);

                    return (
                      <div
                        key={permission}
                        className={cn(
                          'flex items-center space-x-3 p-3 rounded-md transition-colors',
                          enabled && 'bg-muted/50',
                          !readonly && 'hover:bg-muted/70'
                        )}
                      >
                        <Checkbox
                          id={permission}
                          checked={custom}
                          disabled={readonly || inherited}
                          onCheckedChange={() => handleTogglePermission(permission)}
                        />
                        <Label
                          htmlFor={permission}
                          className={cn(
                            'flex-1 cursor-pointer',
                            (readonly || inherited) && 'cursor-default'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn(enabled && 'font-medium')}>
                              {PERMISSION_LABELS[permission]}
                            </span>
                            <div className="flex items-center gap-2">
                              {inherited && custom && (
                                <CheckCircle2 className="h-4 w-4 text-purple-500" />
                              )}
                              {inherited && !custom && (
                                <Lock className="h-4 w-4 text-blue-500" />
                              )}
                              {!inherited && custom && (
                                <Unlock className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                          </div>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Resumo */}
      <div className="bg-muted/30 rounded-md p-4 space-y-2">
        <div className="font-medium text-sm">Resumo de Permissões</div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Herdadas</div>
            <div className="font-medium text-blue-600">{inheritedPermissions.length}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Customizadas</div>
            <div className="font-medium text-green-600">{selectedCustom.size}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Total</div>
            <div className="font-medium text-purple-600">
              {new Set([...inheritedPermissions, ...selectedCustom]).size}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
