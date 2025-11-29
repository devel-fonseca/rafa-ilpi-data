import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2 } from 'lucide-react'
import { ProfileForm } from './ProfileForm'
import { DocumentsTab } from './DocumentsTab'
import { ComplianceTab } from './ComplianceTab'

export default function InstitutionalProfile() {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Perfil Institucional
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie informações institucionais, documentos e compliance
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-full md:grid md:grid-cols-3 min-w-max">
            <TabsTrigger value="profile" className="whitespace-nowrap">Dados Básicos</TabsTrigger>
            <TabsTrigger value="documents" className="whitespace-nowrap">Documentos</TabsTrigger>
            <TabsTrigger value="compliance" className="whitespace-nowrap">Compliance</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="space-y-4">
          <ProfileForm />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <DocumentsTab />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <ComplianceTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
