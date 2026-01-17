import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmailEditor } from '@/components/EmailEditor';
import { VersionHistory } from '@/components/superadmin/VersionHistory';
import { toast } from 'sonner';
import { api } from '@/services/api';

interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  description: string | null;
  jsonContent: Record<string, unknown>;
  variables: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  category: string;
  version: number;
  isActive: boolean;
}

export default function EmailTemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: template, isLoading } = useQuery({
    queryKey: ['email-template', id],
    queryFn: async () => {
      const response = await api.get(`/email-templates/${id}`);
      return response.data as EmailTemplate;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      template: { content: string };
      subject: string;
      changeNote?: string;
    }) => {
      const response = await api.put(`/email-templates/${id}`, {
        jsonContent: data.template,
        subject: data.subject,
        changeNote: data.changeNote,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Template atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      queryClient.invalidateQueries({ queryKey: ['email-template', id] });
      queryClient.invalidateQueries({ queryKey: ['email-template-versions', id] });
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response;
      toast.error(errorResponse?.data?.message || 'Erro ao atualizar template');
    },
  });

  const handleSave = async (
    templateData: { content: string },
    subject: string,
    changeNote?: string
  ) => {
    await updateMutation.mutateAsync({ template: templateData, subject, changeNote });
  };

  const handlePreview = (templateData: { content: string }) => {
    // TODO: Implementar preview
    console.log('Preview:', templateData);
    toast.info('Preview em desenvolvimento');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate('/superadmin/email-templates')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div>
          <h1 className="text-3xl font-bold">{template?.name}</h1>
          {template && (
            <p className="text-muted-foreground mt-1">
              <code className="bg-muted px-2 py-1 rounded text-sm">{template.key}</code>
              {' • '}
              Versão {template.version}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor (2/3 da largura) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border overflow-hidden" style={{ height: '800px' }}>
            <EmailEditor
              initialTemplate={template?.jsonContent}
              subject={template?.subject}
              variables={template?.variables || []}
              onSave={handleSave}
              onPreview={handlePreview}
            />
          </div>
        </div>

        {/* Histórico de Versões (1/3 da largura) */}
        {id && (
          <div className="lg:col-span-1">
            <VersionHistory templateId={id} />
          </div>
        )}
      </div>
    </div>
  );
}
