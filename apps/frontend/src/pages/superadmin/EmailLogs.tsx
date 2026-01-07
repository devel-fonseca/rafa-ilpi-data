import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Mail,
  Search,
  Calendar,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/services/api';

interface EmailLog {
  id: string;
  templateKey: string | null;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  tenantId: string | null;
  resendId: string | null;
  status: 'SENT' | 'FAILED' | 'BOUNCED';
  errorMessage: string | null;
  sentAt: string;
  tenant?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  bounced: number;
  byTemplate: Array<{ templateKey: string; count: number }>;
}

export default function EmailLogs() {
  const [searchEmail, setSearchEmail] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterTemplate, setFilterTemplate] = useState<string>('ALL');

  // Buscar logs
  const { data: logsData, isLoading } = useQuery({
    queryKey: ['email-logs', searchEmail, filterStatus, filterTemplate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchEmail) params.append('recipientEmail', searchEmail);
      if (filterStatus && filterStatus !== 'ALL') params.append('status', filterStatus);
      if (filterTemplate && filterTemplate !== 'ALL') params.append('templateKey', filterTemplate);
      params.append('limit', '50');

      const response = await api.get(`/email-logs?${params.toString()}`);
      return response.data as { logs: EmailLog[]; total: number };
    },
  });

  // Buscar estatísticas
  const { data: stats } = useQuery({
    queryKey: ['email-logs-stats'],
    queryFn: async () => {
      const response = await api.get('/email-logs/stats/summary');
      return response.data as EmailStats;
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <Badge className="bg-success/10 text-success/90 hover:bg-success/10">
            <CheckCircle className="h-3 w-3 mr-1" />
            Enviado
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge className="bg-danger/10 text-danger/90 hover:bg-danger/10">
            <XCircle className="h-3 w-3 mr-1" />
            Falhou
          </Badge>
        );
      case 'BOUNCED':
        return (
          <Badge className="bg-warning/10 text-warning/90 hover:bg-warning/10">
            <AlertCircle className="h-3 w-3 mr-1" />
            Bounce
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTemplateLabel = (key: string | null) => {
    if (!key) return 'Email genérico';

    const labels: Record<string, string> = {
      'user-invite': 'Convite de Usuário',
      'payment-reminder': 'Lembrete de Pagamento',
      'overdue-report': 'Relatório de Inadimplência',
      'trial-expiring': 'Trial Expirando',
      'trial-converted': 'Trial Convertido',
      'tenant-onboarding': 'Boas-vindas ao Tenant',
    };

    return labels[key] || key;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Mail className="h-8 w-8" />
          Histórico de Emails
        </h1>
        <p className="text-muted-foreground mt-1">
          Auditoria completa de todos os emails enviados pelo sistema
        </p>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Emails
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-success">
                Enviados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.sent}</div>
              <p className="text-xs text-muted-foreground">
                {((stats.sent / stats.total) * 100).toFixed(1)}% de sucesso
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-danger">
                Falharam
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-danger">{stats.failed}</div>
              <p className="text-xs text-muted-foreground">
                {((stats.failed / stats.total) * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-warning">
                Bounces
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.bounced}</div>
              <p className="text-xs text-muted-foreground">
                {((stats.bounced / stats.total) * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar por email</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="email@exemplo.com"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os status</SelectItem>
                  <SelectItem value="SENT">Enviado</SelectItem>
                  <SelectItem value="FAILED">Falhou</SelectItem>
                  <SelectItem value="BOUNCED">Bounce</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Template</label>
              <Select value={filterTemplate} onValueChange={setFilterTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os templates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os templates</SelectItem>
                  <SelectItem value="user-invite">Convite de Usuário</SelectItem>
                  <SelectItem value="payment-reminder">Lembrete de Pagamento</SelectItem>
                  <SelectItem value="overdue-report">Relatório de Inadimplência</SelectItem>
                  <SelectItem value="trial-expiring">Trial Expirando</SelectItem>
                  <SelectItem value="trial-converted">Trial Convertido</SelectItem>
                  <SelectItem value="tenant-onboarding">Boas-vindas ao Tenant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(searchEmail || (filterStatus && filterStatus !== 'ALL') || (filterTemplate && filterTemplate !== 'ALL')) && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchEmail('');
                  setFilterStatus('ALL');
                  setFilterTemplate('ALL');
                }}
              >
                Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Logs */}
      <Card>
        <CardHeader>
          <CardTitle>
            Logs de Emails ({logsData?.total || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : logsData && logsData.logs.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsData.logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(log.sentAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{log.recipientName || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">{log.recipientEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={log.subject}>
                          {log.subject}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTemplateLabel(log.templateKey)}</Badge>
                      </TableCell>
                      <TableCell>
                        {log.tenant ? (
                          <div className="text-sm">{log.tenant.name}</div>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum email encontrado com os filtros selecionados
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
