import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, RotateCcw, Clock, User, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { toast } from 'sonner';
import { api } from '@/services/api';

interface EmailTemplateVersion {
  id: string;
  templateId: string;
  versionNumber: number;
  jsonContent: any;
  subject: string;
  createdBy: string;
  changeNote: string | null;
  createdAt: string;
}

interface VersionHistoryProps {
  templateId: string;
}

/**
 * VersionHistory Component
 *
 * Exibe o histórico de versões de um template de email
 * e permite fazer rollback para versões anteriores.
 */
export function VersionHistory({ templateId }: VersionHistoryProps) {
  const queryClient = useQueryClient();
  const [versionToRestore, setVersionToRestore] = useState<EmailTemplateVersion | null>(null);

  // Buscar histórico de versões
  const { data: versions, isLoading } = useQuery({
    queryKey: ['email-template-versions', templateId],
    queryFn: async () => {
      const response = await api.get(`/email-templates/${templateId}/versions`);
      return response.data as EmailTemplateVersion[];
    },
  });

  // Mutation para rollback
  const rollbackMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const response = await api.post(`/email-templates/${templateId}/rollback/${versionId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Template restaurado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      queryClient.invalidateQueries({ queryKey: ['email-template', templateId] });
      queryClient.invalidateQueries({ queryKey: ['email-template-versions', templateId] });
      setVersionToRestore(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao restaurar versão');
    },
  });

  const handleRestoreClick = (version: EmailTemplateVersion) => {
    setVersionToRestore(version);
  };

  const handleConfirmRestore = () => {
    if (versionToRestore) {
      rollbackMutation.mutate(versionToRestore.id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Versões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando histórico...</p>
        </CardContent>
      </Card>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Versões
          </CardTitle>
          <CardDescription>
            Nenhuma versão anterior encontrada. As alterações futuras serão registradas aqui.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Versões
          </CardTitle>
          <CardDescription>
            {versions.length} {versions.length === 1 ? 'versão anterior' : 'versões anteriores'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {versions.map((version) => (
            <Card key={version.id} className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Versão {version.versionNumber}</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(version.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>

                    <div className="text-sm">
                      <strong>Subject:</strong> {version.subject}
                    </div>

                    {version.changeNote && (
                      <div className="text-sm flex items-start gap-2 bg-muted p-2 rounded">
                        <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <span className="flex-1">{version.changeNote}</span>
                      </div>
                    )}

                    {version.createdBy && version.createdBy !== '00000000-0000-0000-0000-000000000000' && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        ID: {version.createdBy.slice(0, 8)}...
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestoreClick(version)}
                    disabled={rollbackMutation.isPending}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restaurar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Dialog de Confirmação */}
      <AlertDialog open={!!versionToRestore} onOpenChange={() => setVersionToRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar versão anterior?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a restaurar a <strong>versão {versionToRestore?.versionNumber}</strong> deste template.
              </p>
              <p className="text-sm">
                <strong>Subject:</strong> {versionToRestore?.subject}
              </p>
              {versionToRestore?.changeNote && (
                <p className="text-sm">
                  <strong>Nota:</strong> {versionToRestore.changeNote}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-4">
                ⚠️ A versão atual será salva no histórico antes de ser substituída.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rollbackMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRestore}
              disabled={rollbackMutation.isPending}
              className="bg-primary/60 hover:bg-blue-700"
            >
              {rollbackMutation.isPending ? 'Restaurando...' : 'Confirmar Restauração'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
