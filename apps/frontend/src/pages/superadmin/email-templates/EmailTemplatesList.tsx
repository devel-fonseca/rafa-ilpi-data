import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEmailTemplates, useDeleteEmailTemplate } from '@/hooks/useEmailTemplates';
import { Mail, MoreHorizontal, Edit2, Eye, Send, History, Trash2 } from 'lucide-react';
import type { EmailTemplate } from '@/api/email-templates.api';
import { format } from 'date-fns';

/**
 * EmailTemplatesList Page
 *
 * Página para gestão de Templates de Email Globais (Sistema).
 * SuperAdmin pode:
 * - Visualizar todos os templates
 * - Editar templates existentes
 * - Ver preview
 * - Enviar emails de teste
 * - Ver histórico de versões
 */
export function EmailTemplatesList() {
  const navigate = useNavigate();
  const { data: templates, isLoading } = useEmailTemplates();
  const deleteTemplateMutation = useDeleteEmailTemplate();

  const getCategoryColor = (category: string) => {
    const colors = {
      ONBOARDING: 'bg-primary/10 text-primary/80 border-primary/50',
      BILLING: 'bg-success/10 text-success/80 border-success/50',
      LIFECYCLE: 'bg-medication-controlled/10 text-medication-controlled/80 border-medication-controlled/50',
      SYSTEM: 'bg-gray-500/10 text-foreground/80 border-border/50/50',
    };
    return colors[category as keyof typeof colors] || colors.SYSTEM;
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      ONBOARDING: 'Onboarding',
      BILLING: 'Cobrança',
      LIFECYCLE: 'Lifecycle',
      SYSTEM: 'Sistema',
    };
    return labels[category as keyof typeof labels] || category;
  };

  const handleDelete = (template: EmailTemplate) => {
    if (window.confirm(`Tem certeza que deseja deletar o template "${template.name}"?`)) {
      deleteTemplateMutation.mutate(template.id);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Mail className="h-8 w-8" />
            Templates de Email
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os templates de email do sistema
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates?.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    {template.description || 'Sem descrição'}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => navigate(`/superadmin/email-templates/${template.id}/edit`)}
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate(`/superadmin/email-templates/${template.id}/preview`)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate(`/superadmin/email-templates/${template.id}/test`)}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Teste
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate(`/superadmin/email-templates/${template.id}/versions`)}
                    >
                      <History className="mr-2 h-4 w-4" />
                      Histórico
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(template)}
                      className="text-danger"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Deletar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Chave:</span>
                <code className="bg-muted px-2 py-1 rounded text-xs">{template.key}</code>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Categoria:</span>
                <Badge variant="outline" className={getCategoryColor(template.category)}>
                  {getCategoryLabel(template.category)}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={template.isActive ? 'default' : 'secondary'}>
                  {template.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Versão:</span>
                <span className="font-medium">v{template.version}</span>
              </div>

              <div className="pt-2 border-t text-xs text-muted-foreground">
                Atualizado em {format(new Date(template.updatedAt), 'dd/MM/yyyy HH:mm')}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates && templates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum template encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Execute o seed para criar os templates padrão
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
