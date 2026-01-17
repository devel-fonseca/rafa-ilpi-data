import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, Save, Calendar, Search } from 'lucide-react';
import { useTenants } from '@/hooks/useSuperAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TiptapEditor } from '@/components/TiptapEditor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { api } from '@/services/api';

interface TenantMessageFormData {
  title: string;
  subject: string;
  htmlContent: string;
  recipientFilter: 'ALL_TENANTS' | 'ACTIVE_ONLY' | 'TRIAL_ONLY' | 'OVERDUE_ONLY' | 'SPECIFIC_TENANTS';
  specificTenantIds: string[];
  scheduledFor: string | null;
}

export default function TenantMessageForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditMode = !!id;

  const [formData, setFormData] = useState<TenantMessageFormData>({
    title: '',
    subject: '',
    htmlContent: '',
    recipientFilter: 'ALL_TENANTS',
    specificTenantIds: [],
    scheduledFor: null,
  });

  const [tenantSearch, setTenantSearch] = useState('');

  // Buscar mensagem existente (modo edição)
  const { data: existingMessage, isLoading: isLoadingMessage } = useQuery({
    queryKey: ['tenant-message', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get(`/tenant-messages/${id}`);
      return response.data;
    },
    enabled: isEditMode,
  });

  // Buscar lista de tenants (para SPECIFIC_TENANTS)
  const { data: tenantsData } = useTenants({ limit: 1000 });

  // Filtrar tenants com base na busca
  const filteredTenants = tenantSearch
    ? tenantsData?.data?.filter(
        (tenant) =>
          tenant.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
          tenant.email.toLowerCase().includes(tenantSearch.toLowerCase())
      )
    : tenantsData?.data;

  // Preencher formulário ao carregar mensagem existente
  useEffect(() => {
    if (existingMessage) {
      setFormData({
        title: existingMessage.title,
        subject: existingMessage.subject,
        htmlContent: existingMessage.htmlContent,
        recipientFilter: existingMessage.recipientFilter,
        specificTenantIds: existingMessage.specificTenantIds || [],
        scheduledFor: existingMessage.scheduledFor
          ? new Date(existingMessage.scheduledFor).toISOString().slice(0, 16)
          : null,
      });
    }
  }, [existingMessage]);

  // Mutation para criar
  const createMutation = useMutation({
    mutationFn: async (data: TenantMessageFormData) => {
      const payload = {
        ...data,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor).toISOString() : null,
      };
      await api.post('/tenant-messages', payload);
    },
    onSuccess: () => {
      toast.success('Mensagem criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['tenant-messages'] });
      navigate('/superadmin/tenant-messages');
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response;
      toast.error(errorResponse?.data?.message || 'Erro ao criar mensagem');
    },
  });

  // Mutation para atualizar
  const updateMutation = useMutation({
    mutationFn: async (data: TenantMessageFormData) => {
      const payload = {
        ...data,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor).toISOString() : null,
      };
      await api.put(`/tenant-messages/${id}`, payload);
    },
    onSuccess: () => {
      toast.success('Mensagem atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['tenant-messages'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-message', id] });
      navigate('/superadmin/tenant-messages');
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response;
      toast.error(errorResponse?.data?.message || 'Erro ao atualizar mensagem');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    if (!formData.subject.trim()) {
      toast.error('Assunto é obrigatório');
      return;
    }
    if (!formData.htmlContent.trim()) {
      toast.error('Conteúdo é obrigatório');
      return;
    }
    if (
      formData.recipientFilter === 'SPECIFIC_TENANTS' &&
      formData.specificTenantIds.length === 0
    ) {
      toast.error('Selecione pelo menos um tenant');
      return;
    }

    if (isEditMode) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleSaveDraft = () => {
    const draftData = { ...formData, scheduledFor: null };
    if (isEditMode) {
      updateMutation.mutate(draftData);
    } else {
      createMutation.mutate(draftData);
    }
  };

  const getRecipientFilterLabel = (filter: string) => {
    const labels: Record<string, string> = {
      ALL_TENANTS: 'Todos os tenants',
      ACTIVE_ONLY: 'Apenas ativos',
      TRIAL_ONLY: 'Apenas trial',
      OVERDUE_ONLY: 'Apenas inadimplentes',
      SPECIFIC_TENANTS: 'Tenants específicos',
    };
    return labels[filter] || filter;
  };

  if (isEditMode && isLoadingMessage) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/superadmin/tenant-messages')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditMode ? 'Editar Mensagem' : 'Nova Mensagem para Tenants'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditMode
              ? 'Atualize os detalhes da mensagem'
              : 'Crie uma nova mensagem para enviar aos tenants'}
          </p>
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Detalhes da Mensagem</CardTitle>
            <CardDescription>Informações básicas e conteúdo da mensagem</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Título <span className="text-danger">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Ex: Novidades da Plataforma - Janeiro 2025"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Título interno para identificação (não aparece no email)
              </p>
            </div>

            {/* Assunto */}
            <div className="space-y-2">
              <Label htmlFor="subject">
                Assunto do Email <span className="text-danger">*</span>
              </Label>
              <Input
                id="subject"
                placeholder="Ex: Conheça as novidades da nossa plataforma!"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Este será o assunto que aparecerá no email
              </p>
            </div>

            {/* Conteúdo HTML */}
            <div className="space-y-2">
              <Label htmlFor="htmlContent">
                Conteúdo do Email <span className="text-danger">*</span>
              </Label>
              <TiptapEditor
                content={formData.htmlContent}
                onChange={(html) => setFormData({ ...formData, htmlContent: html })}
                placeholder="Digite o conteúdo do email usando o editor rico..."
              />
              <p className="text-xs text-muted-foreground">
                Use a barra de ferramentas acima para formatar o conteúdo: títulos, negrito,
                itálico, listas, links, etc.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Destinatários</CardTitle>
            <CardDescription>Selecione quem receberá esta mensagem</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtro de destinatários */}
            <div className="space-y-2">
              <Label htmlFor="recipientFilter">
                Filtro de Destinatários <span className="text-danger">*</span>
              </Label>
              <Select
                value={formData.recipientFilter}
                onValueChange={(value) =>
                  setFormData({ ...formData, recipientFilter: value as TenantMessageFormData['recipientFilter'], specificTenantIds: [] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_TENANTS">Todos os tenants</SelectItem>
                  <SelectItem value="ACTIVE_ONLY">Apenas tenants ativos</SelectItem>
                  <SelectItem value="TRIAL_ONLY">Apenas tenants em trial</SelectItem>
                  <SelectItem value="OVERDUE_ONLY">Apenas tenants inadimplentes</SelectItem>
                  <SelectItem value="SPECIFIC_TENANTS">Tenants específicos</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Selecionado: {getRecipientFilterLabel(formData.recipientFilter)}
              </p>
            </div>

            {/* Lista de tenants específicos */}
            {formData.recipientFilter === 'SPECIFIC_TENANTS' && (
              <div className="space-y-2">
                <Label>Selecione os Tenants</Label>

                {/* Campo de busca e ações */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou email..."
                      value={tenantSearch}
                      onChange={(e) => setTenantSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allIds = tenantsData?.data?.map((t) => t.id) || [];
                      setFormData({ ...formData, specificTenantIds: allIds });
                    }}
                    disabled={!tenantsData?.data?.length}
                  >
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ ...formData, specificTenantIds: [] })}
                    disabled={formData.specificTenantIds.length === 0}
                  >
                    Limpar
                  </Button>
                </div>

                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                  {!tenantsData ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Carregando tenants...
                    </div>
                  ) : filteredTenants && filteredTenants.length > 0 ? (
                    filteredTenants.map((tenant) => (
                      <label
                        key={tenant.id}
                        className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.specificTenantIds.includes(tenant.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                specificTenantIds: [...formData.specificTenantIds, tenant.id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                specificTenantIds: formData.specificTenantIds.filter(
                                  (id) => id !== tenant.id
                                ),
                              });
                            }
                          }}
                          className="rounded"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{tenant.name}</div>
                          <div className="text-xs text-muted-foreground">{tenant.email}</div>
                        </div>
                        <div className="text-xs px-2 py-1 bg-muted rounded">{tenant.status}</div>
                      </label>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      {tenantSearch
                        ? 'Nenhum tenant encontrado com esse termo'
                        : 'Nenhum tenant encontrado'}
                    </div>
                  )}
                </div>

                {/* Contador de selecionados e info */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formData.specificTenantIds.length} tenant(s) selecionado(s)</span>
                  {tenantSearch && filteredTenants && (
                    <span>
                      {filteredTenants.length} de {tenantsData?.data?.length || 0} na busca
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agendamento (Opcional)</CardTitle>
            <CardDescription>
              Agende a mensagem para ser enviada automaticamente em uma data futura
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledFor">Data e Hora de Envio</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <Input
                  id="scheduledFor"
                  type="datetime-local"
                  value={formData.scheduledFor || ''}
                  onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Deixe em branco para salvar como rascunho ou enviar imediatamente
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Botões de ação */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/superadmin/tenant-messages')}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Rascunho
          </Button>

          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="bg-success/60 hover:bg-success/70"
          >
            <Send className="h-4 w-4 mr-2" />
            {formData.scheduledFor ? 'Agendar Envio' : 'Salvar'}
          </Button>
        </div>
      </form>
    </div>
  );
}
