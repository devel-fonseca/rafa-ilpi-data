// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - TeamMemberSelector (Seletor de Membros para Equipe)
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';
import { Search, User, X, Check, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { api } from '@/services/api';
import { tenantKey } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth.store';
import { POSITION_CODE_LABELS, PositionCode } from '@/types/permissions';

interface UserForSelection {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  profile: {
    positionCode: string;
    registrationNumber: string | null;
  } | null;
}

interface TeamMemberSelectorProps {
  value?: string; // userId
  onValueChange: (userId: string | undefined) => void;
  onUserSelect?: (user: UserForSelection | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  excludeUserIds?: string[]; // IDs de usuários já membros (para não aparecerem)
}

const ALLOWED_POSITION_CODES = [
  'CAREGIVER',
  'NURSE',
  'NURSING_TECHNICIAN',
  'NURSING_ASSISTANT',
];

export function TeamMemberSelector({
  value,
  onValueChange,
  onUserSelect,
  disabled = false,
  placeholder = 'Buscar cuidador ou profissional...',
  className,
  excludeUserIds = [],
}: TeamMemberSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const tenantId = user?.tenant?.id;

  // Buscar usuários ativos com cargos adequados
  const { data: users = [] } = useQuery<UserForSelection[]>({
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
    enabled: !!tenantId,
  });

  // Filtrar usuários disponíveis
  const availableUsers = users.filter(
    (user) =>
      user.isActive &&
      user.profile?.positionCode &&
      ALLOWED_POSITION_CODES.includes(user.profile.positionCode) &&
      !excludeUserIds.includes(user.id),
  );

  // Filtrar por busca
  const filteredUsers = availableUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.profile?.registrationNumber &&
        user.profile.registrationNumber
          .toLowerCase()
          .includes(searchQuery.toLowerCase())),
  );

  // Usuário selecionado
  const selectedUser = value ? users.find((u) => u.id === value) : undefined;

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (user: UserForSelection) => {
    onValueChange(user.id);
    onUserSelect?.(user);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onValueChange(undefined);
    onUserSelect?.(undefined);
    setSearchQuery('');
  };

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      {/* Campo de entrada */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9 pr-20"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {selectedUser && (
            <>
              <Badge variant="secondary" className="text-xs">
                {POSITION_CODE_LABELS[
                  selectedUser.profile?.positionCode as PositionCode
                ] || 'Profissional'}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleClear}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Preview do selecionado */}
      {selectedUser && !searchQuery && (
        <Card className="mt-2 p-2">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-success" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedUser.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {selectedUser.email}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Dropdown de resultados */}
      {isOpen && !disabled && (
        <Card className="absolute z-50 mt-2 w-full max-h-[300px] overflow-y-auto shadow-lg">
          {filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchQuery ? (
                'Nenhum profissional encontrado'
              ) : (
                <div>
                  <User className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p>Nenhum profissional disponível</p>
                  <p className="text-xs mt-1">
                    Apenas cuidadores e profissionais de enfermagem ativos
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredUsers.map((user) => {
                const isSelected = value === user.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelect(user)}
                    className={cn(
                      'w-full text-left p-2 rounded-md hover:bg-accent transition-colors',
                      isSelected && 'bg-accent',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <Check className="h-4 w-4 text-success flex-shrink-0" />
                      ) : (
                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                          {user.profile?.registrationNumber && (
                            <Badge variant="outline" className="text-xs">
                              {user.profile.registrationNumber}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        {POSITION_CODE_LABELS[
                          user.profile?.positionCode as PositionCode
                        ] || 'Profissional'}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
