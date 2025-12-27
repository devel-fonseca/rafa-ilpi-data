import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEmailTemplate, useUpdateEmailTemplate } from '@/hooks/useEmailTemplates';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { EmailEditor } from '@/components/EmailEditor';
import { toast } from 'sonner';

/**
 * EmailTemplateEditor Page
 *
 * Editor WYSIWYG para templates de email.
 * Integra TiptapEditor para edição visual de HTML.
 */
export function EmailTemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: template, isLoading } = useEmailTemplate(id);
  const updateTemplateMutation = useUpdateEmailTemplate();

  const handleSave = async (
    emailTemplate: { content: string },
    subject: string,
    changeNote?: string
  ) => {
    if (!id || !template) return;

    try {
      await updateTemplateMutation.mutateAsync({
        id,
        data: {
          subject,
          jsonContent: emailTemplate, // Agora é { content: htmlString }
          changeNote,
        },
      });

      toast.success('Template salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      toast.error('Erro ao salvar template');
      throw error;
    }
  };

  const handlePreview = (emailTemplate: { content: string }) => {
    // Salvar template no localStorage temporariamente para preview
    localStorage.setItem('preview-template', JSON.stringify(emailTemplate));
    navigate(`/superadmin/email-templates/${id}/preview`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertDescription>Template não encontrado</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/superadmin/email-templates')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Edit2 className="h-6 w-6" />
              Editar Template: {template.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Versão {template.version} • {template.key} • {template.category}
            </p>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <EmailEditor
          initialTemplate={
            typeof template.jsonContent === 'object' && template.jsonContent !== null
              ? (template.jsonContent as { content: string })
              : { content: '<p>Template vazio</p>' }
          }
          subject={template.subject}
          variables={
            Array.isArray(template.variables)
              ? (template.variables as Array<{
                  name: string;
                  type: string;
                  required: boolean;
                  description?: string;
                }>)
              : []
          }
          onSave={handleSave}
          onPreview={handlePreview}
        />
      </div>
    </div>
  );
}
