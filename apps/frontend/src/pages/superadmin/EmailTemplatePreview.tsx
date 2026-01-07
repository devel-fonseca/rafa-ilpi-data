import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Code, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/services/api';

interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  jsonContent: any;
  variables: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
}

export default function EmailTemplatePreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [mockData, setMockData] = useState<Record<string, any>>({});

  const { data: template, isLoading } = useQuery({
    queryKey: ['email-template', id],
    queryFn: async () => {
      const response = await api.get(`/email-templates/${id}`);
      return response.data as EmailTemplate;
    },
  });

  useEffect(() => {
    if (template) {
      // Gerar dados mockados baseados nas variáveis
      const mock = generateMockData(template.variables);
      setMockData(mock);

      // Gerar preview
      generatePreview(template.jsonContent, mock);
    }
  }, [template]);

  const generateMockData = (
    variables: EmailTemplate['variables']
  ): Record<string, any> => {
    const mock: Record<string, any> = {};

    variables.forEach((variable) => {
      switch (variable.type) {
        case 'string':
          // Casos específicos para nomes de variáveis conhecidas
          if (variable.name === 'tenantName') {
            mock[variable.name] = 'Residencial Geriátrico';
          } else if (variable.name === 'adminName' || variable.name === 'name') {
            mock[variable.name] = 'Dr. João da Silva';
          } else if (variable.name === 'adminEmail' || variable.name === 'email') {
            mock[variable.name] = 'joao.silva@exemplo.com';
          } else if (variable.name === 'supportEmail') {
            mock[variable.name] = 'suporte@rafalabs.com.br';
          } else if (variable.name === 'planName') {
            mock[variable.name] = 'Plano Premium';
          } else if (variable.name.includes('url') || variable.name.includes('Url')) {
            mock[variable.name] = 'https://rafa-ilpi.rafalabs.com.br';
          } else if (variable.name.includes('password') || variable.name.includes('Password')) {
            mock[variable.name] = 'Temp@123456';
          } else if (variable.name.includes('email') || variable.name.includes('Email')) {
            mock[variable.name] = 'exemplo@email.com';
          } else if (variable.name.includes('name') || variable.name.includes('Name')) {
            mock[variable.name] = 'João da Silva';
          } else {
            mock[variable.name] = `Exemplo de ${variable.name}`;
          }
          break;
        case 'number':
          if (variable.name.includes('amount') || variable.name.includes('Amount')) {
            mock[variable.name] = 299.90;
          } else if (variable.name.includes('days') || variable.name.includes('Days')) {
            mock[variable.name] = 7;
          } else {
            mock[variable.name] = 123.45;
          }
          break;
        case 'date':
          mock[variable.name] = new Date().toISOString();
          break;
        case 'boolean':
          mock[variable.name] = true;
          break;
        default:
          mock[variable.name] = `{{${variable.name}}}`;
      }
    });

    return mock;
  };

  const generatePreview = async (jsonContent: any, variables: Record<string, any>) => {
    try {
      const response = await api.post('/email-templates/preview', {
        jsonContent,
        variables,
      });
      setPreviewHtml(response.data.html);
    } catch (error) {
      console.error('Erro ao gerar preview:', error);
      setPreviewHtml('<p>Erro ao gerar preview</p>');
    }
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

  if (!template) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-muted-foreground">Template não encontrado</p>
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
          <h1 className="text-3xl font-bold">Preview: {template.name}</h1>
          <p className="text-muted-foreground mt-1">
            <code className="bg-muted px-2 py-1 rounded text-sm">{template.key}</code>
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Preview do Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview do Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="preview">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="preview">Renderizado</TabsTrigger>
                <TabsTrigger value="html">HTML</TabsTrigger>
              </TabsList>
              <TabsContent value="preview" className="mt-4">
                <div className="border rounded overflow-auto" style={{ maxHeight: '600px' }}>
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-[600px] border-0"
                    sandbox="allow-same-origin"
                    title="Preview do Email"
                  />
                </div>
              </TabsContent>
              <TabsContent value="html" className="mt-4">
                <pre className="bg-muted p-4 rounded overflow-auto text-xs" style={{ maxHeight: '600px' }}>
                  {previewHtml}
                </pre>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Dados de Teste */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Dados de Teste
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded overflow-auto text-xs">
              {JSON.stringify(mockData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
