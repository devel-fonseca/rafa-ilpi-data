import { Page, PageHeader } from '@/design-system/components';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, BarChart3, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ConformidadePage() {
  const navigate = useNavigate();

  return (
    <Page>
      <PageHeader
        title="Conformidade"
        subtitle="Central de conformidade regulatória e documental"
      />

      {/* Grid de Cards de Navegação */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Documentos Institucionais */}
        <Card
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() =>
            navigate('/dashboard/perfil-institucional?tab=documentos')
          }
        >
          <CardContent className="p-6">
            <FileText className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Documentos da Instituição
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Gestão de documentos obrigatórios: estatuto, alvarás, licenças
              sanitárias, AVCB e outros.
            </p>
            <Button variant="outline" className="w-full">
              Acessar Documentos →
            </Button>
          </CardContent>
        </Card>

        {/* Card 2: Indicadores Mensais RDC */}
        <Card
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => navigate('/dashboard/conformidade/indicadores-mensais')}
        >
          <CardContent className="p-6">
            <BarChart3 className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Indicadores Mensais Obrigatórios
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Indicadores RDC 502/2021 (ANVISA): mortalidade, doenças, úlceras e
              desnutrição.
            </p>
            <Button variant="outline" className="w-full">
              Ver Indicadores →
            </Button>
          </CardContent>
        </Card>

        {/* Card 3: Placeholder Futuro */}
        <Card className="opacity-60">
          <CardContent className="p-6">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-muted-foreground">
              Outras Conformidades
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Em breve: outras áreas de conformidade regulatória.
            </p>
            <Button variant="outline" className="w-full" disabled>
              Em desenvolvimento
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Card Informativo */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <h4 className="text-sm font-semibold mb-2">
            📋 Sobre a Conformidade Regulatória
          </h4>
          <p className="text-sm text-muted-foreground">
            Esta central reúne todas as áreas de conformidade exigidas pela
            legislação brasileira para Instituições de Longa Permanência para
            Idosos (ILPIs). Mantenha sua documentação e indicadores sempre
            atualizados para garantir conformidade com ANVISA, Vigilância
            Sanitária e demais órgãos reguladores.
          </p>
        </CardContent>
      </Card>
    </Page>
  );
}
