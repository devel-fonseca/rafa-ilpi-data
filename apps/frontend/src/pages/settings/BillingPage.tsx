import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreditCard, FileText, TrendingUp } from 'lucide-react'
import { CurrentPlanTab } from './CurrentPlanTab'
import { AvailablePlansTab } from './AvailablePlansTab'
import { InvoicesHistoryTab } from './InvoicesHistoryTab'

export function BillingPage() {
  const [activeTab, setActiveTab] = useState('current-plan')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Plano</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie sua assinatura, faturas e método de pagamento
        </p>
      </div>

      {/* Tabs */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="current-plan" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Plano Atual</span>
                <span className="sm:hidden">Atual</span>
              </TabsTrigger>
              <TabsTrigger value="available-plans" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Planos Disponíveis</span>
                <span className="sm:hidden">Planos</span>
              </TabsTrigger>
              <TabsTrigger value="invoices" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Histórico de Faturas</span>
                <span className="sm:hidden">Faturas</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="current-plan" className="mt-0">
              <CurrentPlanTab />
            </TabsContent>

            <TabsContent value="available-plans" className="mt-0">
              <AvailablePlansTab />
            </TabsContent>

            <TabsContent value="invoices" className="mt-0">
              <InvoicesHistoryTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
