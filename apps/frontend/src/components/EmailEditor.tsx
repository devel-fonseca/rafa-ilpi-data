import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Eye, Copy, Check } from 'lucide-react';
import { TiptapEditor } from '@/components/tiptap/TiptapEditor';
import { toast } from 'sonner';

interface EmailEditorProps {
  initialTemplate?: { content: string }; // HTML content
  subject?: string;
  variables?: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  onSave?: (template: { content: string }, subject: string, changeNote?: string) => Promise<void>;
  onPreview?: (template: { content: string }) => void;
}

/**
 * EmailEditor Component
 *
 * Editor WYSIWYG para templates de email usando TiptapEditor.
 * Suporta variáveis dinâmicas no formato {{variableName}}.
 */
export function EmailEditor({
  initialTemplate,
  subject: initialSubject = '',
  variables = [],
  onSave,
  onPreview,
}: EmailEditorProps) {
  const [htmlContent, setHtmlContent] = useState<string>(
    initialTemplate?.content || '<p>Digite o conteúdo do email aqui...</p>'
  );
  const [subject, setSubject] = useState(initialSubject);
  const [changeNote, setChangeNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  // Sincronizar template inicial quando mudar
  useEffect(() => {
    if (initialTemplate?.content) {
      setHtmlContent(initialTemplate.content);
    }
  }, [initialTemplate]);

  const handleSave = async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave({ content: htmlContent }, subject, changeNote);
      setChangeNote(''); // Limpar nota após salvar
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview({ content: htmlContent });
    }
  };

  const handleCopyVariable = (variableName: string) => {
    const variableText = `{{${variableName}}}`;
    navigator.clipboard.writeText(variableText);
    setCopiedVariable(variableName);
    toast.success(`Variável copiada: ${variableText}`);

    // Resetar ícone após 2 segundos
    setTimeout(() => setCopiedVariable(null), 2000);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header com Subject e Ações */}
      <div className="border-b bg-white p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="subject">Subject do Email</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto do email (use {{variableName}} para variáveis)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Ex: Bem-vindo(a) à {'{{tenantName}}'}, {'{{name}}'}!
            </p>
          </div>

          <div>
            <Label htmlFor="changeNote">Nota de Mudança (opcional)</Label>
            <Input
              id="changeNote"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="Descreva o que foi alterado"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar Template'}
          </Button>
          <Button variant="outline" onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>

        {/* Variáveis Disponíveis */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-2">Variáveis Disponíveis (clique para copiar):</h3>
          <div className="flex flex-wrap gap-2">
            {variables.length > 0 ? (
              variables.map((variable) => (
                <button
                  key={variable.name}
                  className="inline-flex items-center gap-1 border rounded px-2 py-1 hover:bg-gray-50 cursor-pointer text-xs transition-colors"
                  onClick={() => handleCopyVariable(variable.name)}
                  title={variable.description || `Copiar {{${variable.name}}}`}
                >
                  <code className="bg-blue-100 text-blue-800 px-1 rounded font-mono">
                    {'{{' + variable.name + '}}'}
                  </code>
                  <span className="text-muted-foreground">({variable.type})</span>
                  {variable.required && <span className="text-red-500">*</span>}
                  {copiedVariable === variable.name ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3 text-gray-400" />
                  )}
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma variável definida</p>
            )}
          </div>
        </div>
      </div>

      {/* Editor TiptapEditor */}
      <div className="flex-1 overflow-auto bg-white p-4">
        <TiptapEditor
          content={htmlContent}
          onChange={setHtmlContent}
          placeholder="Digite o conteúdo do email aqui. Use {{variableName}} para inserir variáveis dinâmicas."
          className="min-h-[400px]"
        />
      </div>
    </div>
  );
}
