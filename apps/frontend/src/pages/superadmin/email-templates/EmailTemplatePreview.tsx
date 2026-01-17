import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEmailTemplate } from '@/hooks/useEmailTemplates';
import { ArrowLeft, Eye, Send, RefreshCw } from 'lucide-react';
import * as emailTemplatesApi from '@/api/email-templates.api';
import type { TemplateVariable } from '@/api/email-templates.api';
import { toast } from 'sonner';

/**
 * EmailTemplatePreview Page
 *
 * Preview dinâmico de templates de email com dados mockados editáveis.
 * Renderiza HTML real usando a API de preview do backend.
 */
export function EmailTemplatePreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: template, isLoading } = useEmailTemplate(id);

  const [mockData, setMockData] = useState<Record<string, unknown>>({});
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Gerar dados mockados baseados nas variáveis do template
  const generateMockData = (variables: TemplateVariable[]): Record<string, unknown> => {
    const mock: Record<string, unknown> = {};

    variables.forEach((variable) => {
      switch (variable.type) {
        case 'string':
          if (variable.name.includes('email') || variable.name.includes('Email')) {
            mock[variable.name] = 'exemplo@email.com';
          } else if (variable.name.includes('name') || variable.name.includes('Name')) {
            mock[variable.name] = 'João Silva';
          } else if (variable.name.includes('tenant') || variable.name.includes('Tenant')) {
            mock[variable.name] = 'ILPI Exemplo';
          } else if (variable.name.includes('plan') || variable.name.includes('Plan')) {
            mock[variable.name] = 'Plano Básico';
          } else if (variable.name.includes('url') || variable.name.includes('Url')) {
            mock[variable.name] = 'https://example.com';
          } else {
            mock[variable.name] = 'Texto de exemplo';
          }
          break;
        case 'number':
          if (variable.name.includes('amount') || variable.name.includes('value')) {
            mock[variable.name] = 299.9;
          } else if (variable.name.includes('days')) {
            mock[variable.name] = 7;
          } else {
            mock[variable.name] = 100;
          }
          break;
        case 'date':
          mock[variable.name] = new Date().toISOString();
          break;
        case 'boolean':
          mock[variable.name] = true;
          break;
        default:
          mock[variable.name] = 'Valor de exemplo';
      }
    });

    return mock;
  };

  // Inicializar dados mockados quando template carregar
  useEffect(() => {
    if (template?.variables && Array.isArray(template.variables)) {
      const initialMock = generateMockData(template.variables);
      setMockData(initialMock);
    }
  }, [template]);

  // Carregar preview do localStorage ou gerar novo
  useEffect(() => {
    if (!id || !template) return;

    const loadPreview = async () => {
      setIsLoadingPreview(true);
      try {
        // Verificar se há template no localStorage (vindo do editor)
        const localTemplate = localStorage.getItem('preview-template');
        let jsonContent = template.jsonContent;

        if (localTemplate) {
          jsonContent = JSON.parse(localTemplate);
          localStorage.removeItem('preview-template'); // Limpar
        }

        // Se jsonContent for { content: htmlString }, usar diretamente
        if (typeof jsonContent === 'object' && jsonContent !== null && 'content' in jsonContent) {
          // HTML já está pronto, apenas substituir variáveis
          let html = (jsonContent as { content: string }).content;

          // Substituir variáveis {{variableName}} com valores mockados
          Object.entries(mockData).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            html = html.replace(regex, String(value));
          });

          setPreviewHtml(html);
        } else {
          // Fallback: tentar usar API de preview (para compatibilidade com templates antigos MJML)
          const result = await emailTemplatesApi.previewEmailTemplate({
            jsonContent,
            variables: mockData,
          });

          setPreviewHtml(result.html);
        }
      } catch (error) {
        console.error('Erro ao gerar preview:', error);
        toast.error('Erro ao gerar preview do email');
      } finally {
        setIsLoadingPreview(false);
      }
    };

    if (Object.keys(mockData).length > 0) {
      loadPreview();
    }
  }, [id, template, mockData]);

  // Atualizar valor de uma variável mockada
  const updateMockValue = (key: string, value: string) => {
    const variable = (template?.variables as TemplateVariable[])?.find((v) => v.name === key);
    if (!variable) return;

    let parsedValue: unknown = value;

    // Converter para tipo correto
    if (variable.type === 'number') {
      parsedValue = parseFloat(value) || 0;
    } else if (variable.type === 'boolean') {
      parsedValue = value === 'true';
    }

    setMockData((prev) => ({ ...prev, [key]: parsedValue }));
  };

  // Regenerar preview
  const handleRefreshPreview = async () => {
    if (!template) return;

    setIsLoadingPreview(true);
    try {
      const jsonContent = template.jsonContent;

      // Se for HTML direto, substituir variáveis
      if (typeof jsonContent === 'object' && jsonContent !== null && 'content' in jsonContent) {
        let html = (jsonContent as { content: string }).content;

        // Substituir variáveis
        Object.entries(mockData).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          html = html.replace(regex, String(value));
        });

        setPreviewHtml(html);
      } else {
        // Fallback: usar API de preview
        const result = await emailTemplatesApi.previewEmailTemplate({
          jsonContent: template.jsonContent,
          variables: mockData,
        });
        setPreviewHtml(result.html);
      }

      toast.success('Preview atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar preview');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Enviar email de teste
  const handleSendTest = async () => {
    if (!id || !testEmail) return;

    setIsSendingTest(true);
    try {
      await emailTemplatesApi.sendTestEmail(id, {
        to: testEmail,
        variables: mockData,
      });
      toast.success(`Email de teste enviado para ${testEmail}!`);
    } catch (error) {
      toast.error('Erro ao enviar email de teste');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Renderizar subject com variáveis substituídas
  const renderedSubject = useMemo(() => {
    if (!template?.subject) return '';

    let result = template.subject;
    Object.entries(mockData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    });
    return result;
  }, [template, mockData]);

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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/superadmin/email-templates/${id}/edit`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Editor
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Eye className="h-8 w-8" />
              Preview: {template.name}
            </h1>
            <p className="text-muted-foreground mt-1">Visualização com dados de teste</p>
          </div>
        </div>

        <Button onClick={handleRefreshPreview} disabled={isLoadingPreview}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar Preview
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dados Mockados - Editáveis */}
        <Card>
          <CardHeader>
            <CardTitle>Dados de Teste</CardTitle>
            <CardDescription>Edite os valores para testar o template</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {template.variables && Array.isArray(template.variables) ? (
              template.variables.map((variable: TemplateVariable) => (
                <div key={variable.name}>
                  <Label htmlFor={variable.name} className="text-xs">
                    {variable.name}
                    {variable.required && <span className="text-danger ml-1">*</span>}
                    <span className="text-muted-foreground ml-2">({variable.type})</span>
                  </Label>
                  <Input
                    id={variable.name}
                    value={String(mockData[variable.name] || '')}
                    onChange={(e) => updateMockValue(variable.name, e.target.value)}
                    placeholder={variable.description || `Digite ${variable.name}`}
                    className="mt-1"
                  />
                  {variable.description && (
                    <p className="text-xs text-muted-foreground mt-1">{variable.description}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma variável definida</p>
            )}

            <div className="pt-4 border-t space-y-3">
              <div>
                <Label htmlFor="testEmail">Enviar Email de Teste</Label>
                <Input
                  id="testEmail"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="seuemail@example.com"
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleSendTest}
                disabled={!testEmail || isSendingTest}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSendingTest ? 'Enviando...' : 'Enviar Teste'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview do Email */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Preview do Email</CardTitle>
            <CardDescription>
              <strong>Subject:</strong> {renderedSubject}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPreview ? (
              <div className="flex items-center justify-center h-[600px] border rounded-lg bg-muted/50">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground/70" />
                  <p className="text-sm text-muted-foreground">Gerando preview...</p>
                </div>
              </div>
            ) : (
              <iframe
                srcDoc={previewHtml}
                className="w-full h-[600px] border rounded-lg"
                sandbox="allow-same-origin"
                title="Email Preview"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
