import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VersionHistory } from '@/components/superadmin/VersionHistory';
import { api } from '@/services/api';

interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  version: number;
}

export default function EmailTemplateVersions() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: template, isLoading } = useQuery({
    queryKey: ['email-template', id],
    queryFn: async () => {
      const response = await api.get(`/email-templates/${id}`);
      return response.data as EmailTemplate;
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-muted-foreground">Template não encontrado</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
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
          <h1 className="text-3xl font-bold">{template.name}</h1>
          <p className="text-muted-foreground mt-1">
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">{template.key}</code>
            {' • '}
            Versão atual: {template.version}
          </p>
        </div>
      </div>

      {id && <VersionHistory templateId={id} />}
    </div>
  );
}
